use assert_cmd::Command;
use predicates::str::contains;
use serial_test::serial;
use std::fs;

// Helper to write temporary governance.toml
fn write_governance(contents: &str) {
    fs::create_dir_all("config").ok();
    fs::write("config/governance.toml", contents).unwrap();
}

#[test]
#[serial]
fn flags_override_config() {
    write_governance("quorum='0.10'\nthreshold='0.60'\nveto='0.20'\ndeposit_min='1000udgt'\nvoting_period='100'\n");
    let mut cmd = Command::cargo_bin("dcli").unwrap();
    cmd.arg("--gov.quorum")
        .arg("0.25")
        .arg("governance")
        .arg("print-effective");
    cmd.assert()
        .success()
        .stdout(contains("quorum=0.25 source=flag"));
}

#[test]
#[serial]
fn config_used_when_no_flags() {
    write_governance("quorum='0.12'\nthreshold='0.50'\nveto='0.30'\ndeposit_min='1000udgt'\nvoting_period='100'\n");
    let mut cmd = Command::cargo_bin("dcli").unwrap();
    cmd.arg("governance").arg("print-effective");
    cmd.assert()
        .success()
        .stdout(contains("quorum=0.12 source=config"));
}

#[test]
#[serial]
fn invalid_relationship_errors() {
    write_governance("quorum='0.60'\nthreshold='0.50'\nveto='0.10'\ndeposit_min='1000udgt'\nvoting_period='100'\n");
    let mut cmd = Command::cargo_bin("dcli").unwrap();
    cmd.arg("governance").arg("validate");
    cmd.assert()
        .failure()
        .stderr(contains("quorum 0.6 cannot exceed threshold 0.5"));
}

#[test]
#[serial]
fn deposit_parsing_denied_wrong_denom() {
    write_governance("quorum='0.20'\nthreshold='0.50'\nveto='0.10'\ndeposit_min='1000foo'\nvoting_period='100'\n");
    let mut cmd = Command::cargo_bin("dcli").unwrap();
    cmd.arg("governance").arg("validate");
    cmd.assert()
        .failure()
        .stderr(contains("unexpected denom foo"));
}

#[test]
#[serial]
fn init_idempotent_patch() {
    write_governance("quorum='0.33'\nthreshold='0.50'\nveto='0.334'\ndeposit_min='1000udgt'\nvoting_period='100'\n");
    // first run
    let mut first = Command::cargo_bin("dcli").unwrap();
    first
        .arg("init")
        .arg("--genesis-out")
        .arg("genesis-test.json");
    first.assert().success();
    let orig = fs::read_to_string("genesis-test.json").unwrap();
    // second run (should preserve)
    let mut second = Command::cargo_bin("dcli").unwrap();
    second
        .arg("init")
        .arg("--genesis-out")
        .arg("genesis-test.json");
    second.assert().success();
    let after = fs::read_to_string("genesis-test.json").unwrap();
    assert_eq!(orig, after);
}

#[test]
#[serial]
fn init_force_overwrites() {
    write_governance("quorum='0.33'\nthreshold='0.50'\nveto='0.334'\ndeposit_min='1000udgt'\nvoting_period='100'\n");
    let mut first = Command::cargo_bin("dcli").unwrap();
    first
        .arg("init")
        .arg("--genesis-out")
        .arg("genesis-force.json");
    first.assert().success();
    fs::write("genesis-force.json", "{\"other\":123}").unwrap();
    let mut force = Command::cargo_bin("dcli").unwrap();
    force
        .arg("init")
        .arg("--genesis-out")
        .arg("genesis-force.json")
        .arg("--force");
    force.assert().success().stdout(contains("Genesis written"));
    let content = fs::read_to_string("genesis-force.json").unwrap();
    assert!(content.contains("governance"));
}
