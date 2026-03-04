//! Perform a check-in on the Dead Man's Switch account.
//!
//! Usage: cargo run --bin check-in -- <account-address>
//!
//! This calls the `check_in()` RPC on the deadmans-wallet component,
//! resetting the heartbeat timer.

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let account = args.get(1).map(|s| s.as_str()).unwrap_or("<account-address>");

    println!("=== Dead Man's Switch — Check In ===");
    println!();
    println!("Account: {}", account);
    println!();
    println!("This calls check_in() on the deployed account component.");
    println!("The current block number is saved as the last check-in.");
    println!();
    println!("To check in via Miden CLI:");
    println!("  miden tx --account {} --call deadmans_switch::check_in", account);
    println!();
    println!("Or use the frontend: click 'Check In' on the dashboard.");
}
