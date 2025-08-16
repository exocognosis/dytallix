use dcli::keystore::{create_new, unlock, get_unlocked, purge};

#[test]
fn purge_works() {
    let dir = tempfile::tempdir().unwrap(); let home = dir.path().to_str().unwrap();
    create_new(home, "alice", "pw").unwrap();
    unlock(home, "alice", "pw").unwrap();
    assert!(get_unlocked("alice").is_some());
    purge();
    assert!(get_unlocked("alice").is_none());
}
