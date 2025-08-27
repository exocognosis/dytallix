//! Dytallix Root Package
//!
//! This is the root package for the Dytallix project workspace.
//! The main functionality is implemented in the workspace members.

pub mod wallet_test_utils {
    //! Utilities used by wallet tests

    pub use blake3;
    pub use hex;
    pub use sha2;
}

// Added minimal public API so the root crate builds as a library.
pub mod prelude {
    //! Common re-exports for examples and integration tests.
    pub use blake3;
    pub use dytallix_interoperability as interoperability;
    pub use dytallix_pqc as pqc;
    pub use hex;
    pub use sha2;
}

// Placeholder function to ensure at least one item compiled and to allow doctests.
/// Returns project name.
pub fn project_name() -> &'static str {
    "dytallix"
}
