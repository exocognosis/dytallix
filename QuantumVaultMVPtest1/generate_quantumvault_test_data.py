#!/usr/bin/env python3
"""Generate synthetic healthcare datasets for QuantumVault testing.

This script creates a QuantumVaultTestData directory with per-domain
subfolders and synthetic files sized to approximate the target ranges.
"""

from __future__ import annotations

import argparse
import gzip
import json
import os
import random
import string
import time
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import Callable, Dict, Iterable, List, Optional, Tuple

KB = 1024
MB = 1024 * KB
GB = 1024 * MB

MIN_FILE_BYTES = 512
DEFAULT_CHUNK_BYTES = 4 * MB

PROFILE_DEFAULTS = {
    "demo": {"count_scale": 0.001, "size_scale": 0.02, "max_files": 200},
    "balanced": {"count_scale": 0.02, "size_scale": 0.2, "max_files": 2000},
    "full": {"count_scale": 1.0, "size_scale": 1.0, "max_files": None},
}


def clamp_min(value: int, minimum: int) -> int:
    return value if value >= minimum else minimum


def parse_size_string(size_str: str) -> int:
    """Parse size strings like '20GB', '500MB', '1TB' into bytes."""
    size_str = size_str.strip().upper()
    multipliers = {
        'B': 1,
        'KB': KB,
        'MB': MB,
        'GB': GB,
        'TB': 1024 * GB,
    }
    for suffix, mult in sorted(multipliers.items(), key=lambda x: -len(x[0])):
        if size_str.endswith(suffix):
            try:
                return int(float(size_str[:-len(suffix)]) * mult)
            except ValueError:
                raise ValueError(f"Invalid size value: {size_str}")
    # Assume bytes if no suffix
    try:
        return int(size_str)
    except ValueError:
        raise ValueError(f"Invalid size string: {size_str}")


def scaled_range(min_val: int, max_val: int, scale: float) -> Tuple[int, int]:
    scaled_min = clamp_min(int(min_val * scale), MIN_FILE_BYTES)
    scaled_max = clamp_min(int(max_val * scale), scaled_min)
    return scaled_min, scaled_max


def pick_range(rng: random.Random, min_val: int, max_val: int) -> int:
    if min_val >= max_val:
        return min_val
    return rng.randint(min_val, max_val)


def safe_write_bytes(path: Path, data: bytes) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("wb") as f:
        f.write(data)
    return len(data)


def pad_file_to_size(path: Path, target_bytes: int, rng: random.Random) -> int:
    current_size = path.stat().st_size
    if current_size >= target_bytes:
        return current_size
    remaining = target_bytes - current_size
    with path.open("ab") as f:
        while remaining > 0:
            chunk = min(DEFAULT_CHUNK_BYTES, remaining)
            f.write(os.urandom(chunk))
            remaining -= chunk
    return target_bytes


def random_date(rng: random.Random, start_year: int, end_year: int) -> str:
    start = date(start_year, 1, 1)
    end = date(end_year, 12, 31)
    delta = (end - start).days
    return (start + timedelta(days=rng.randint(0, delta))).isoformat()


def random_time(rng: random.Random) -> str:
    hour = rng.randint(0, 23)
    minute = rng.randint(0, 59)
    second = rng.randint(0, 59)
    return f"{hour:02d}:{minute:02d}:{second:02d}"


def random_phone(rng: random.Random) -> str:
    return f"{rng.randint(200, 999)}-{rng.randint(200, 999)}-{rng.randint(1000, 9999)}"


def random_zip(rng: random.Random) -> str:
    return f"{rng.randint(10000, 99999)}"


def random_choice(rng: random.Random, values: List[str]) -> str:
    return values[rng.randint(0, len(values) - 1)]


def random_words(rng: random.Random, word_count: int) -> str:
    words = []
    for _ in range(word_count):
        length = rng.randint(3, 10)
        word = "".join(rng.choice(string.ascii_lowercase) for _ in range(length))
        words.append(word)
    return " ".join(words)


def random_sentence(rng: random.Random, min_words: int = 6, max_words: int = 14) -> str:
    sentence = random_words(rng, rng.randint(min_words, max_words)).capitalize()
    return f"{sentence}."


def random_paragraph(rng: random.Random, min_sentences: int = 3, max_sentences: int = 6) -> str:
    return " ".join(random_sentence(rng) for _ in range(rng.randint(min_sentences, max_sentences)))


FIRST_NAMES = [
    "Avery",
    "Jordan",
    "Morgan",
    "Taylor",
    "Riley",
    "Casey",
    "Quinn",
    "Skyler",
    "Reese",
    "Rowan",
]

LAST_NAMES = [
    "Carter",
    "Nguyen",
    "Garcia",
    "Patel",
    "Kim",
    "Johnson",
    "Martinez",
    "Lee",
    "Brown",
    "Davis",
]

CITIES = ["Austin", "Seattle", "Denver", "Nashville", "Boston", "Raleigh", "Phoenix", "Orlando"]
STATES = ["TX", "WA", "CO", "TN", "MA", "NC", "AZ", "FL"]
STREETS = ["Oak", "Maple", "Pine", "Cedar", "Elm", "Willow", "Sunset", "Ridge"]
PROVIDERS = ["PROV1001", "PROV2044", "PROV3982", "PROV5120", "PROV7033"]
INSURANCE = ["AETNA", "BCBS", "CIGNA", "UNITED", "KAISER"]

ICD_CODES = ["I10", "E11.9", "J45.909", "M54.5", "R07.9", "K21.9", "F41.1"]
LOINC_CODES = ["718-7", "4548-4", "789-8", "2951-2", "2339-0", "2093-3"]
MED_NAMES = ["Lisinopril", "Metformin", "Atorvastatin", "Albuterol", "Amlodipine", "Omeprazole"]
ROUTES = ["PO", "IV", "IM", "SC", "INH"]
FREQUENCIES = ["daily", "BID", "TID", "QHS", "PRN"]
ORDER_TYPES = ["Lab", "Imaging", "Consult", "Medication", "Procedure"]
CARE_PLANS = ["Fall risk", "Diabetes management", "Hypertension monitoring", "Post-op recovery"]


MIN_PDF = (
    b"%PDF-1.4\n1 0 obj<<>>endobj\n2 0 obj<<>>endobj\n"
    b"3 0 obj<</Type/Catalog/Pages 4 0 R>>endobj\n"
    b"4 0 obj<</Type/Pages/Count 1/Kids[5 0 R]>>endobj\n"
    b"5 0 obj<</Type/Page/Parent 4 0 R/MediaBox[0 0 200 200]>>endobj\n"
    b"xref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n"
    b"0000000029 00000 n \n0000000048 00000 n \n0000000085 00000 n \n"
    b"0000000130 00000 n \ntrailer<</Size 6/Root 3 0 R>>\nstartxref\n170\n%%EOF\n"
)

MIN_PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d4948445200000001000000010802000000"
    "907753de0000000a49444154789c6360000002000100fe2ffa0b00000000"
    "49454e44ae426082"
)

# Minimal JPEG 1x1 pixel (JFIF). Valid enough for most viewers.
MIN_JPEG = (
    b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
    b"\xff\xdb\x00C\x00" + b"\x08" * 64 +
    b"\xff\xc0\x00\x11\x08\x00\x01\x00\x01\x03\x01\x11\x00\x02\x11\x01\x03\x11\x01"
    b"\xff\xc4\x00\x14\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"
    b"\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xd2\xcf \xff\xd9"
)

# Minimal TIFF header (little endian) with a single empty IFD.
MIN_TIFF = (
    b"II*\x00\x08\x00\x00\x00\x00\x00\x00\x00"
)


@dataclass
class CategorySpec:
    key: str
    label: str
    formats: List[str]
    count_range: Tuple[int, int]
    size_range_bytes: Tuple[int, int]
    generator: Callable[[Path, str, int, random.Random], int]
    rare_size_range_bytes: Optional[Tuple[int, int]] = None
    rare_ratio: float = 0.0
    gzip_ratio: float = 0.0


class DataGenerator:
    def __init__(self, rng: random.Random, chunk_bytes: int) -> None:
        self.rng = rng
        self.chunk_bytes = chunk_bytes

    def generate_csv_records(
        self,
        path: Path,
        headers: List[str],
        record_fn: Callable[[random.Random], Dict[str, str]],
        target_bytes: int,
    ) -> int:
        path.parent.mkdir(parents=True, exist_ok=True)
        bytes_written = 0
        with path.open("wb") as f:
            header_line = ",".join(headers) + "\n"
            data = header_line.encode("utf-8")
            f.write(data)
            bytes_written += len(data)
            while bytes_written < target_bytes:
                record = record_fn(self.rng)
                row = ",".join(record[h] for h in headers) + "\n"
                data = row.encode("utf-8")
                f.write(data)
                bytes_written += len(data)
        return bytes_written

    def generate_json_lines(
        self,
        path: Path,
        record_fn: Callable[[random.Random], Dict[str, str]],
        target_bytes: int,
    ) -> int:
        path.parent.mkdir(parents=True, exist_ok=True)
        bytes_written = 0
        with path.open("wb") as f:
            while bytes_written < target_bytes:
                record = record_fn(self.rng)
                line = json.dumps(record, separators=(",", ":"), ensure_ascii=True) + "\n"
                data = line.encode("utf-8")
                f.write(data)
                bytes_written += len(data)
        return bytes_written

    def generate_text_blob(self, path: Path, target_bytes: int) -> int:
        path.parent.mkdir(parents=True, exist_ok=True)
        bytes_written = 0
        with path.open("wb") as f:
            while bytes_written < target_bytes:
                paragraph = random_paragraph(self.rng) + "\n\n"
                data = paragraph.encode("utf-8")
                f.write(data)
                bytes_written += len(data)
        return bytes_written

    def generate_pdf(self, path: Path, target_bytes: int) -> int:
        safe_write_bytes(path, MIN_PDF)
        return pad_file_to_size(path, target_bytes, self.rng)

    def generate_image(self, path: Path, fmt: str, target_bytes: int) -> int:
        if fmt == "png":
            base = MIN_PNG
        elif fmt == "jpeg":
            base = MIN_JPEG
        else:
            base = MIN_TIFF
        safe_write_bytes(path, base)
        return pad_file_to_size(path, target_bytes, self.rng)

    def generate_binary(self, path: Path, target_bytes: int) -> int:
        path.parent.mkdir(parents=True, exist_ok=True)
        bytes_written = 0
        with path.open("wb") as f:
            while bytes_written < target_bytes:
                chunk = min(self.chunk_bytes, target_bytes - bytes_written)
                f.write(os.urandom(chunk))
                bytes_written += chunk
        return bytes_written

    def generate_dicom_like(self, path: Path, target_bytes: int) -> int:
        header = b"\x00" * 128 + b"DICM" + b"\x02\x00\x00\x00SYNTHETIC"
        safe_write_bytes(path, header)
        return pad_file_to_size(path, target_bytes, self.rng)

    def generate_fasta(self, path: Path, target_bytes: int, gzip_enabled: bool) -> int:
        def write_content(handle) -> int:
            bytes_written = 0
            seq_id = 0
            while bytes_written < target_bytes:
                header = f">sample_{seq_id}\n".encode("ascii")
                handle.write(header)
                bytes_written += len(header)
                for _ in range(50):
                    line = "".join(self.rng.choice("ACGT") for _ in range(60)) + "\n"
                    data = line.encode("ascii")
                    handle.write(data)
                    bytes_written += len(data)
                    if bytes_written >= target_bytes:
                        break
                seq_id += 1
            return bytes_written

        path.parent.mkdir(parents=True, exist_ok=True)
        if gzip_enabled:
            with gzip.open(path, "wb", compresslevel=2) as gz:
                bytes_written = 0
                while bytes_written < target_bytes:
                    before = gz.fileobj.tell()
                    write_content(gz)
                    gz.flush()
                    after = gz.fileobj.tell()
                    bytes_written += max(1, after - before)
                return gz.fileobj.tell()
        with path.open("wb") as f:
            return write_content(f)

    def generate_vcf(self, path: Path, target_bytes: int, gzip_enabled: bool) -> int:
        header_lines = [
            "##fileformat=VCFv4.2",
            "##source=QuantumVaultSynthetic",
            "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO",
        ]

        def write_content(handle) -> int:
            bytes_written = 0
            for line in header_lines:
                data = (line + "\n").encode("ascii")
                handle.write(data)
                bytes_written += len(data)
            while bytes_written < target_bytes:
                chrom = str(self.rng.randint(1, 22))
                pos = str(self.rng.randint(10000, 9999999))
                ref = self.rng.choice(["A", "C", "G", "T"])
                alt = self.rng.choice(["A", "C", "G", "T"])
                qual = f"{self.rng.uniform(10, 99):.2f}"
                info = f"DP={self.rng.randint(10, 500)}"
                row = f"{chrom}\t{pos}\t.\t{ref}\t{alt}\t{qual}\tPASS\t{info}\n"
                data = row.encode("ascii")
                handle.write(data)
                bytes_written += len(data)
            return bytes_written

        path.parent.mkdir(parents=True, exist_ok=True)
        if gzip_enabled:
            with gzip.open(path, "wb", compresslevel=2) as gz:
                bytes_written = 0
                while bytes_written < target_bytes:
                    before = gz.fileobj.tell()
                    write_content(gz)
                    gz.flush()
                    after = gz.fileobj.tell()
                    bytes_written += max(1, after - before)
                return gz.fileobj.tell()
        with path.open("wb") as f:
            return write_content(f)


@dataclass
class CategoryResult:
    files: int = 0
    bytes_written: int = 0
    format_counts: Dict[str, int] = None

    def __post_init__(self) -> None:
        if self.format_counts is None:
            self.format_counts = {}

    def record(self, fmt: str, size: int) -> None:
        self.files += 1
        self.bytes_written += size
        self.format_counts[fmt] = self.format_counts.get(fmt, 0) + 1


class QuantumVaultDataBuilder:
    def __init__(
        self,
        output_dir: Path,
        profile: str,
        count_scale: float,
        size_scale: float,
        max_files: Optional[int],
        chunk_bytes: int,
        seed: int,
        progress_every: int,
        dry_run: bool,
        max_total_bytes: Optional[int] = None,
    ) -> None:
        self.output_dir = output_dir
        self.profile = profile
        self.count_scale = count_scale
        self.size_scale = size_scale
        self.max_files = max_files
        self.progress_every = progress_every
        self.dry_run = dry_run
        self.max_total_bytes = max_total_bytes
        self.total_bytes_written = 0
        self.rng = random.Random(seed)
        self.generator = DataGenerator(self.rng, chunk_bytes)

    def bytes_remaining(self) -> Optional[int]:
        """Return bytes remaining before hitting limit, or None if no limit."""
        if self.max_total_bytes is None:
            return None
        return max(0, self.max_total_bytes - self.total_bytes_written)

    def is_limit_reached(self) -> bool:
        """Check if the total bytes limit has been reached."""
        if self.max_total_bytes is None:
            return False
        return self.total_bytes_written >= self.max_total_bytes

    def _scaled_count(self, count_range: Tuple[int, int]) -> int:
        min_count, max_count = count_range
        scaled_min = max(1, int(min_count * self.count_scale))
        scaled_max = max(scaled_min, int(max_count * self.count_scale))
        count = pick_range(self.rng, scaled_min, scaled_max)
        if self.max_files is not None:
            count = min(count, self.max_files)
        return count

    def _scaled_size(self, size_range_bytes: Tuple[int, int]) -> Tuple[int, int]:
        return scaled_range(size_range_bytes[0], size_range_bytes[1], self.size_scale)

    def _pick_size(self, spec: CategorySpec) -> int:
        if spec.rare_size_range_bytes and self.rng.random() < spec.rare_ratio:
            min_val, max_val = self._scaled_size(spec.rare_size_range_bytes)
        else:
            min_val, max_val = self._scaled_size(spec.size_range_bytes)
        return pick_range(self.rng, min_val, max_val)

    def _choose_format(self, spec: CategorySpec, index: int) -> str:
        if spec.gzip_ratio > 0:
            gz_formats = [fmt for fmt in spec.formats if fmt.endswith(".gz")]
            plain_formats = [fmt for fmt in spec.formats if not fmt.endswith(".gz")]
            if gz_formats and plain_formats:
                if self.rng.random() < spec.gzip_ratio:
                    return random_choice(self.rng, gz_formats)
                return random_choice(self.rng, plain_formats)
        return spec.formats[index % len(spec.formats)]

    def generate_category(self, spec: CategorySpec) -> CategoryResult:
        category_dir = self.output_dir / spec.key
        file_count = self._scaled_count(spec.count_range)
        result = CategoryResult()
        if self.dry_run:
            return result
        for idx in range(file_count):
            # Check if total limit has been reached
            if self.is_limit_reached():
                print(f"  {spec.key}: Stopped at {idx}/{file_count} (total limit reached)")
                break
            fmt = self._choose_format(spec, idx)
            size_target = self._pick_size(spec)
            # Optionally cap file size to remaining bytes
            remaining = self.bytes_remaining()
            if remaining is not None and size_target > remaining:
                size_target = remaining
                if size_target < MIN_FILE_BYTES:
                    print(f"  {spec.key}: Stopped at {idx}/{file_count} (total limit reached)")
                    break
            file_name = f"{spec.key}_{idx+1:05d}.{fmt}"
            path = category_dir / file_name
            size_written = spec.generator(path, fmt, size_target, self.rng)
            result.record(fmt, size_written)
            self.total_bytes_written += size_written
            if file_count <= 10 or (idx + 1) % self.progress_every == 0:
                print(
                    f"  {spec.key}: {idx+1}/{file_count} ({fmt}, {size_written / MB:.2f} MB)"
                )
        return result


# Record builders

def patient_record(rng: random.Random) -> Dict[str, str]:
    first = random_choice(rng, FIRST_NAMES)
    last = random_choice(rng, LAST_NAMES)
    street = f"{rng.randint(100, 9999)} {random_choice(rng, STREETS)} St"
    city = random_choice(rng, CITIES)
    state = random_choice(rng, STATES)
    return {
        "patient_id": f"P{rng.randint(100000, 999999)}",
        "name": f"{first} {last}",
        "dob": random_date(rng, 1940, 2015),
        "sex": random_choice(rng, ["F", "M", "O"]),
        "address": f"{street}; {city}; {state} {random_zip(rng)}",
        "phone": random_phone(rng),
        "mrn": f"MRN{rng.randint(100000, 999999)}",
        "insurance_id": f"{random_choice(rng, INSURANCE)}-{rng.randint(1000000, 9999999)}",
    }


def encounter_record(rng: random.Random) -> Dict[str, str]:
    admit_date = random_date(rng, 2018, 2025)
    return {
        "visit_id": f"V{rng.randint(1000000, 9999999)}",
        "patient_id": f"P{rng.randint(100000, 999999)}",
        "admit_date": admit_date,
        "discharge_date": random_date(rng, 2018, 2025),
        "location": f"{random_choice(rng, CITIES)}-{rng.randint(1, 9)}",
        "provider_id": random_choice(rng, PROVIDERS),
        "diagnosis_codes": "|".join(rng.sample(ICD_CODES, rng.randint(1, 3))),
    }


def diagnosis_record(rng: random.Random) -> Dict[str, str]:
    return {
        "diagnosis_id": f"D{rng.randint(1000000, 9999999)}",
        "patient_id": f"P{rng.randint(100000, 999999)}",
        "icd_code": random_choice(rng, ICD_CODES),
        "onset_date": random_date(rng, 2010, 2025),
        "chronic_flag": random_choice(rng, ["acute", "chronic"]),
    }


def medication_record(rng: random.Random) -> Dict[str, str]:
    start = random_date(rng, 2015, 2025)
    return {
        "medication_id": f"M{rng.randint(1000000, 9999999)}",
        "patient_id": f"P{rng.randint(100000, 999999)}",
        "med_name": random_choice(rng, MED_NAMES),
        "dose": f"{rng.randint(1, 500)} mg",
        "route": random_choice(rng, ROUTES),
        "frequency": random_choice(rng, FREQUENCIES),
        "start_date": start,
        "stop_date": random_date(rng, 2016, 2025),
    }


def lab_record(rng: random.Random) -> Dict[str, str]:
    return {
        "lab_id": f"L{rng.randint(1000000, 9999999)}",
        "patient_id": f"P{rng.randint(100000, 999999)}",
        "loinc_code": random_choice(rng, LOINC_CODES),
        "test_name": "Panel" + str(rng.randint(1, 12)),
        "value": f"{rng.uniform(0.1, 15.0):.2f}",
        "unit": random_choice(rng, ["mg/dL", "mmol/L", "%", "mmHg"]),
        "timestamp": f"{random_date(rng, 2019, 2025)}T{random_time(rng)}",
    }


def analytics_record(rng: random.Random) -> Dict[str, str]:
    return {
        "cohort_id": f"C{rng.randint(100, 999)}",
        "risk_score": f"{rng.uniform(0.0, 1.0):.4f}",
        "metric": random_choice(rng, ["readmit_rate", "avg_los", "med_adherence"]),
        "trend": random_choice(rng, ["up", "down", "flat"]),
        "timestamp": f"{random_date(rng, 2020, 2025)}T{random_time(rng)}",
    }


def audit_record(rng: random.Random) -> Dict[str, str]:
    return {
        "event_id": f"EV{rng.randint(100000, 999999)}",
        "timestamp": f"{random_date(rng, 2021, 2025)}T{random_time(rng)}Z",
        "checksum": "".join(rng.choice(string.hexdigits.lower()) for _ in range(64)),
        "policy": random_choice(rng, ["vault", "access", "retention", "encryption"]),
        "expected_outcome": random_choice(rng, ["allow", "deny", "alert"]),
        "observed_outcome": random_choice(rng, ["allow", "deny", "alert"]),
    }


def order_record(rng: random.Random) -> Dict[str, str]:
    return {
        "order_id": f"O{rng.randint(1000000, 9999999)}",
        "patient_id": f"P{rng.randint(100000, 999999)}",
        "order_type": random_choice(rng, ORDER_TYPES),
        "care_plan": random_choice(rng, CARE_PLANS),
        "priority": random_choice(rng, ["routine", "urgent", "stat"]),
        "requested_at": f"{random_date(rng, 2021, 2025)}T{random_time(rng)}",
    }


# Category-specific generators

def generate_records_file(
    generator: DataGenerator,
    path: Path,
    fmt: str,
    target_bytes: int,
    record_fn: Callable[[random.Random], Dict[str, str]],
    headers: List[str],
) -> int:
    if fmt == "csv":
        return generator.generate_csv_records(path, headers, record_fn, target_bytes)
    if fmt in ("json", "jsonl"):
        return generator.generate_json_lines(path, record_fn, target_bytes)
    raise ValueError(f"Unsupported record format: {fmt}")


def generate_notes_file(generator: DataGenerator, path: Path, fmt: str, target_bytes: int) -> int:
    if fmt == "txt":
        return generator.generate_text_blob(path, target_bytes)
    if fmt == "pdf":
        return generator.generate_pdf(path, target_bytes)
    raise ValueError(f"Unsupported notes format: {fmt}")


def generate_order_file(generator: DataGenerator, path: Path, fmt: str, target_bytes: int) -> int:
    if fmt == "txt":
        return generator.generate_text_blob(path, target_bytes)
    if fmt == "pdf":
        return generator.generate_pdf(path, target_bytes)
    if fmt in ("json", "jsonl"):
        return generator.generate_json_lines(path, order_record, target_bytes)
    raise ValueError(f"Unsupported order format: {fmt}")


def generate_media_file(generator: DataGenerator, path: Path, fmt: str, target_bytes: int) -> int:
    if fmt == "pdf":
        return generator.generate_pdf(path, target_bytes)
    if fmt in ("png", "jpeg", "tiff"):
        return generator.generate_image(path, fmt, target_bytes)
    raise ValueError(f"Unsupported media format: {fmt}")


def generate_imaging_file(generator: DataGenerator, path: Path, fmt: str, target_bytes: int) -> int:
    if fmt == "dcm":
        return generator.generate_dicom_like(path, target_bytes)
    return generator.generate_binary(path, target_bytes)


def generate_fasta_file(generator: DataGenerator, path: Path, fmt: str, target_bytes: int) -> int:
    gzip_enabled = fmt.endswith(".gz")
    return generator.generate_fasta(path, target_bytes, gzip_enabled)


def generate_vcf_file(generator: DataGenerator, path: Path, fmt: str, target_bytes: int) -> int:
    gzip_enabled = fmt.endswith(".gz")
    return generator.generate_vcf(path, target_bytes, gzip_enabled)


def build_categories(generator: DataGenerator) -> List[CategorySpec]:
    """Build category specifications matching the QuantumVault Test framework.
    
    Target Size Budgets (full scale):
    - Patient Demographics: 0.5-1.5 GB
    - Encounters/Visits: 0.5-1.5 GB
    - Diagnoses & Problems: 0.3-1 GB
    - Medications: 0.3-1.2 GB
    - Labs/Vitals: 0.4-2 GB
    - Clinical Notes: 1-2 GB
    - Media (Consent & Legal): 3-5 GB
    - Orders/Care Plans: 1-5 GB
    - Imaging Objects: 2-10 GB
    - Genomic FASTA: 5-10 GB
    - Genomic VCF: 1-5 GB
    - Derived Analytics: 1-5 GB
    - Operational/Audit: <0.1 GB
    
    Total target: ~17-45 GB at full scale
    """
    return [
        # Patient Demographics (PHI): 0.5-1.5 GB target
        CategorySpec(
            key="patient_demographics",
            label="PatientDemographics",
            formats=["csv", "json"],
            count_range=(3, 10),
            size_range_bytes=(50 * MB, 300 * MB),
            generator=lambda p, f, s, r: generate_records_file(
                generator,
                p,
                f,
                s,
                patient_record,
                ["patient_id", "name", "dob", "sex", "address", "phone", "mrn", "insurance_id"],
            ),
        ),
        # Encounters/Visits: 0.5-1.5 GB target
        CategorySpec(
            key="encounters_visits",
            label="EncountersVisits",
            formats=["csv", "json"],
            count_range=(3, 5),
            size_range_bytes=(100 * MB, 500 * MB),
            generator=lambda p, f, s, r: generate_records_file(
                generator,
                p,
                f,
                s,
                encounter_record,
                [
                    "visit_id",
                    "patient_id",
                    "admit_date",
                    "discharge_date",
                    "location",
                    "provider_id",
                    "diagnosis_codes",
                ],
            ),
        ),
        # Diagnoses & Problems: 0.3-1 GB target
        CategorySpec(
            key="diagnoses_problems",
            label="DiagnosesProblems",
            formats=["csv"],
            count_range=(2, 4),
            size_range_bytes=(50 * MB, 300 * MB),
            generator=lambda p, f, s, r: generate_records_file(
                generator,
                p,
                f,
                s,
                diagnosis_record,
                ["diagnosis_id", "patient_id", "icd_code", "onset_date", "chronic_flag"],
            ),
        ),
        # Medications: 0.3-1.2 GB target
        CategorySpec(
            key="medications",
            label="Medications",
            formats=["csv", "json"],
            count_range=(2, 3),
            size_range_bytes=(100 * MB, 600 * MB),
            generator=lambda p, f, s, r: generate_records_file(
                generator,
                p,
                f,
                s,
                medication_record,
                [
                    "medication_id",
                    "patient_id",
                    "med_name",
                    "dose",
                    "route",
                    "frequency",
                    "start_date",
                    "stop_date",
                ],
            ),
        ),
        # Labs/Vitals: 0.4-2 GB target
        CategorySpec(
            key="labs_vitals",
            label="LabsVitals",
            formats=["csv"],
            count_range=(2, 8),
            size_range_bytes=(200 * MB, 800 * MB),
            generator=lambda p, f, s, r: generate_records_file(
                generator,
                p,
                f,
                s,
                lab_record,
                ["lab_id", "patient_id", "loinc_code", "test_name", "value", "unit", "timestamp"],
            ),
        ),
        # Clinical Notes (Unstructured): 1-2 GB target, 40K-60K files, 5-50 KB typical
        CategorySpec(
            key="clinical_notes",
            label="ClinicalNotes",
            formats=["txt", "pdf"],
            count_range=(40_000, 60_000),
            size_range_bytes=(5 * KB, 50 * KB),
            generator=lambda p, f, s, r: generate_notes_file(generator, p, f, s),
        ),
        # Media (Consent & Legal Documents): 3-5 GB target, 20K-100K files, 100KB-5MB
        CategorySpec(
            key="media_consent_legal",
            label="MediaConsentLegal",
            formats=["pdf", "png", "jpeg", "tiff"],
            count_range=(20_000, 100_000),
            size_range_bytes=(100 * KB, 5 * MB),
            generator=lambda p, f, s, r: generate_media_file(generator, p, f, s),
        ),
        # Orders/Care Plans: 1-5 GB target, 50K-200K files, 10-200 KB
        CategorySpec(
            key="orders_care_plans",
            label="OrdersCarePlans",
            formats=["json", "txt", "pdf"],
            count_range=(50_000, 200_000),
            size_range_bytes=(10 * KB, 200 * KB),
            generator=lambda p, f, s, r: generate_order_file(generator, p, f, s),
        ),
        # Imaging-like Objects (Binary): 2-10 GB target, 200-2000 files, 1-50 MB
        CategorySpec(
            key="imaging_objects",
            label="ImagingObjects",
            formats=["bin", "dcm"],
            count_range=(200, 2_000),
            size_range_bytes=(1 * MB, 50 * MB),
            generator=lambda p, f, s, r: generate_imaging_file(generator, p, f, s),
        ),
        # Genomic FASTA-like: 5-10 GB target, 2K-8K files, 1-5 MB (some large)
        CategorySpec(
            key="genomic_fasta",
            label="GenomicFASTA",
            formats=["fasta", "fasta.gz"],
            count_range=(2_000, 8_000),
            size_range_bytes=(1 * MB, 5 * MB),
            rare_size_range_bytes=(50 * MB, 200 * MB),
            rare_ratio=0.02,
            gzip_ratio=0.2,
            generator=lambda p, f, s, r: generate_fasta_file(generator, p, f, s),
        ),
        # Genomic VCF-like: 1-5 GB target, 20K-100K files, 20-200 KB
        CategorySpec(
            key="genomic_vcf",
            label="GenomicVCF",
            formats=["vcf", "vcf.gz"],
            count_range=(20_000, 100_000),
            size_range_bytes=(20 * KB, 200 * KB),
            gzip_ratio=0.3,
            generator=lambda p, f, s, r: generate_vcf_file(generator, p, f, s),
        ),
        # Derived/De-identified Analytics: 1-5 GB target, 20K-50K files, 10-200 KB
        CategorySpec(
            key="derived_analytics",
            label="DerivedAnalytics",
            formats=["csv", "json"],
            count_range=(20_000, 50_000),
            size_range_bytes=(10 * KB, 200 * KB),
            generator=lambda p, f, s, r: generate_records_file(
                generator,
                p,
                f,
                s,
                analytics_record,
                ["cohort_id", "risk_score", "metric", "trend", "timestamp"],
            ),
        ),
        # Operational/Audit Inputs: <0.1 GB target, 10K-100K files, 1-50 KB
        CategorySpec(
            key="operational_audit",
            label="OperationalAudit",
            formats=["json"],
            count_range=(10_000, 100_000),
            size_range_bytes=(1 * KB, 50 * KB),
            generator=lambda p, f, s, r: generate_records_file(
                generator,
                p,
                f,
                s,
                audit_record,
                [
                    "event_id",
                    "timestamp",
                    "checksum",
                    "policy",
                    "expected_outcome",
                    "observed_outcome",
                ],
            ),
        ),
    ]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate synthetic QuantumVault healthcare data.")
    parser.add_argument(
        "--output-dir",
        default="QuantumVaultTestData",
        help="Output directory for generated data (default: QuantumVaultTestData).",
    )
    parser.add_argument(
        "--profile",
        choices=PROFILE_DEFAULTS.keys(),
        default="balanced",
        help="Generation profile controlling scale (default: balanced).",
    )
    parser.add_argument(
        "--scale",
        type=float,
        default=1.0,
        help="Additional scale multiplier applied to profile sizes and counts.",
    )
    parser.add_argument(
        "--max-files",
        type=int,
        default=None,
        help="Cap files per category (overrides profile cap if set).",
    )
    parser.add_argument(
        "--chunk-bytes",
        type=int,
        default=DEFAULT_CHUNK_BYTES,
        help="Chunk size for binary writes (default: 4MB).",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=20250126,
        help="Seed for reproducible output.",
    )
    parser.add_argument(
        "--categories",
        default=None,
        help="Comma-separated list of categories to generate.",
    )
    parser.add_argument(
        "--progress-every",
        type=int,
        default=100,
        help="Progress log interval for large categories.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print plan without generating files.",
    )
    parser.add_argument(
        "--manifest",
        action="store_true",
        help="Write a summary manifest.json in the output directory.",
    )
    parser.add_argument(
        "--max-total-bytes",
        type=str,
        default=None,
        help="Maximum total bytes to generate (e.g., '20GB', '500MB'). Stops when limit is reached.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    profile_config = PROFILE_DEFAULTS[args.profile]
    count_scale = profile_config["count_scale"] * args.scale
    size_scale = profile_config["size_scale"] * args.scale
    max_files = args.max_files if args.max_files is not None else profile_config["max_files"]

    output_dir = Path(args.output_dir).expanduser().resolve()
    max_total_bytes = None
    if args.max_total_bytes:
        max_total_bytes = parse_size_string(args.max_total_bytes)
        print(f"Max total bytes limit: {max_total_bytes / GB:.2f} GB")

    builder = QuantumVaultDataBuilder(
        output_dir=output_dir,
        profile=args.profile,
        count_scale=count_scale,
        size_scale=size_scale,
        max_files=max_files,
        chunk_bytes=args.chunk_bytes,
        seed=args.seed,
        progress_every=args.progress_every,
        dry_run=args.dry_run,
        max_total_bytes=max_total_bytes,
    )

    categories = build_categories(builder.generator)
    if args.categories:
        allowed = {c.strip() for c in args.categories.split(",") if c.strip()}
        categories = [spec for spec in categories if spec.key in allowed]
        if not categories:
            raise SystemExit("No matching categories found for --categories")

    if args.dry_run:
        print("Dry run only. Planned categories:")
        for spec in categories:
            print(f"- {spec.key} ({spec.count_range[0]}-{spec.count_range[1]} files)")
        return

    start = time.time()
    summary: Dict[str, Dict[str, object]] = {}
    total_files = 0
    total_bytes = 0

    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Generating QuantumVault test data in: {output_dir}")
    print(f"Profile={args.profile} count_scale={count_scale} size_scale={size_scale}")

    for spec in categories:
        print(f"\nCategory: {spec.key}")
        result = builder.generate_category(spec)
        summary[spec.key] = {
            "files": result.files,
            "bytes": result.bytes_written,
            "formats": result.format_counts,
        }
        total_files += result.files
        total_bytes += result.bytes_written

    elapsed = time.time() - start
    print("\nGeneration complete")
    print(f"Total files: {total_files}")
    print(f"Total size: {total_bytes / GB:.2f} GB")
    print(f"Elapsed: {elapsed:.1f}s")

    if args.manifest:
        manifest = {
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "profile": args.profile,
            "count_scale": count_scale,
            "size_scale": size_scale,
            "total_files": total_files,
            "total_bytes": total_bytes,
            "categories": summary,
        }
        manifest_path = output_dir / "manifest.json"
        manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        print(f"Manifest written: {manifest_path}")


if __name__ == "__main__":
    main()
