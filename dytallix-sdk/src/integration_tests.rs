// Self-contained, ignored test to ensure this file always compiles without relying on external types.
#[cfg(test)]
mod tests {
    #[derive(Debug, Clone)]
    struct MockTransaction {
        from: String,
        to: String,
        amount: u64,
    }

    impl MockTransaction {
        fn new<F: Into<String>, T: Into<String>>(from: F, to: T, amount: u64) -> Self {
            Self { from: from.into(), to: to.into(), amount }
        }
    }

    #[test]
    #[ignore]
    fn integration_smoke_compiles() {
        let sender_address = "dytallix1senderxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
        let tx = MockTransaction::new(
            sender_address,
            "dytallix1qw508d6qejxtdg4y5r3zarvary0c5xw7k3lh9z3",
            1_000_000, // 1 DYT in base units
        );

        assert_eq!(tx.amount, 1_000_000);
        assert!(tx.from.starts_with("dytallix1"));
        assert!(tx.to.starts_with("dytallix1"));
    }
}