    let (call_count, last_called, memory_usage) = stats.unwrap();
    assert_eq!(call_count, 1); // One successful call
    assert_eq!(last_called, call.timestamp);
    assert!((memory_usage as i64) >= 0);

    println!("Testing state persistence...");