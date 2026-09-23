"""Adaptador restrito para o script pediátrico original, executado sem shell."""
import json
import math
import subprocess
import sys
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'calcular_pediatria.py'
FIELDS = {
    'dose-volume': ('weight_kg','dose_mg_kg','concentration_mg_ml','max_dose_mg'),
    'maintenance': ('weight_kg',),
    'drip': ('volume_ml','hours','drop_factor'),
}
REQUIRED = {
    'dose-volume': ('weight_kg','dose_mg_kg','concentration_mg_ml'),
    'maintenance': ('weight_kg',),
    'drip': ('volume_ml','hours'),
}


def calculate(command: str, values: dict) -> dict:
    if command not in FIELDS or set(values) - set(FIELDS.get(command,())):
        raise ValueError('Comando ou campos inválidos')
    if set(REQUIRED[command]) - set(values):
        raise ValueError('Faltam dados obrigatórios')
    argv = [sys.executable, str(SCRIPT), command]
    for field in FIELDS[command]:
        value=values.get(field)
        if value is None:
            continue
        try:
            number=float(value)
        except (ValueError,TypeError):
            raise ValueError(f'{field} deve ser numérico') from None
        if not math.isfinite(number) or not 0 < number <= 100000:
            raise ValueError(f'{field} deve ser finito, positivo e ≤ 100000')
        if field=='weight_kg' and number > 300:
            raise ValueError('Peso fora dos limites da ferramenta')
        argv.extend(['--'+field.replace('_','-'),str(value)])
    run=subprocess.run(argv,capture_output=True,text=True,timeout=5,check=False)
    if run.returncode:
        raise ValueError(run.stderr.strip()[-500:] or 'Falha no cálculo')
    return json.loads(run.stdout)
