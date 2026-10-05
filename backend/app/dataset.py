import json
from pathlib import Path
from functools import lru_cache

DATASET_PATH = Path(__file__).resolve().parent / "data_pipeline" / "internship_dataset.json"


@lru_cache(maxsize=1)
def load_dataset() -> list[dict]:
    with open(DATASET_PATH) as f:
        return json.load(f)


def get_posting(job_id: int) -> dict | None:
    return next((p for p in load_dataset() if p["source_job_id"] == job_id), None)