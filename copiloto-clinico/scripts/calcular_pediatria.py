#!/usr/bin/env python3
"""Conferir cálculos determinísticos de dose, manutenção e gotejamento pediátricos."""

import argparse
import json
from decimal import Decimal, ROUND_HALF_UP


def decimal_value(value: str) -> Decimal:
    number = Decimal(value)
    if number <= 0:
        raise argparse.ArgumentTypeError("o valor deve ser maior que zero")
    return number


def rounded(value: Decimal, places: str = "0.0001") -> str:
    result = value.quantize(Decimal(places), rounding=ROUND_HALF_UP)
    return format(result.normalize(), "f")


def dose_volume(args: argparse.Namespace) -> dict[str, str]:
    dose_mg = args.weight_kg * args.dose_mg_kg
    if args.max_dose_mg is not None:
        dose_mg = min(dose_mg, args.max_dose_mg)
    volume_ml = dose_mg / args.concentration_mg_ml
    return {
        "dose_mg": rounded(dose_mg),
        "volume_ml": rounded(volume_ml),
    }


def maintenance(args: argparse.Namespace) -> dict[str, str]:
    weight = args.weight_kg
    if weight <= Decimal("10"):
        daily = weight * Decimal("100")
        four_two_one = weight * Decimal("4")
    elif weight <= Decimal("20"):
        daily = Decimal("1000") + (weight - Decimal("10")) * Decimal("50")
        four_two_one = Decimal("40") + (weight - Decimal("10")) * Decimal("2")
    else:
        daily = Decimal("1500") + (weight - Decimal("20")) * Decimal("20")
        four_two_one = Decimal("60") + (weight - Decimal("20"))
    return {
        "holliday_segar_ml_day": rounded(daily),
        "holliday_segar_ml_h": rounded(daily / Decimal("24")),
        "four_two_one_ml_h": rounded(four_two_one),
    }


def drip(args: argparse.Namespace) -> dict[str, str]:
    minutes = args.hours * Decimal("60")
    exact = args.volume_ml * args.drop_factor / minutes
    whole = exact.quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return {
        "exact_gtt_min": rounded(exact),
        "rounded_gtt_min": format(whole, "f"),
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    dose = subparsers.add_parser("dose-volume")
    dose.add_argument("--weight-kg", type=decimal_value, required=True)
    dose.add_argument("--dose-mg-kg", type=decimal_value, required=True)
    dose.add_argument("--concentration-mg-ml", type=decimal_value, required=True)
    dose.add_argument("--max-dose-mg", type=decimal_value)
    dose.set_defaults(function=dose_volume)

    fluid = subparsers.add_parser("maintenance")
    fluid.add_argument("--weight-kg", type=decimal_value, required=True)
    fluid.set_defaults(function=maintenance)

    drops = subparsers.add_parser("drip")
    drops.add_argument("--volume-ml", type=decimal_value, required=True)
    drops.add_argument("--hours", type=decimal_value, required=True)
    drops.add_argument("--drop-factor", type=decimal_value, default=Decimal("20"))
    drops.set_defaults(function=drip)

    return parser


def main() -> None:
    args = build_parser().parse_args()
    print(json.dumps(args.function(args), ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
