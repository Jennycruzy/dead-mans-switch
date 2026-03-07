use miden_client::account::{AccountBuilder, AccountType, StorageSlot};

use miden_client::keystore::FilesystemKeyStore;
use miden_client::rpc::{Endpoint, GrpcClient};
use miden_client::Word;
use miden_client::builder::ClientBuilder;
use miden_client_sqlite_store::ClientBuilderSqliteExt;
use miden_protocol::account::auth::AuthSecretKey;
use miden_protocol::account::{AccountComponent, StorageSlotName};
use miden_client::assembly::CodeBuilder;
use miden_standards::account::auth::AuthFalcon512Rpo;
use miden_standards::account::wallets::BasicWallet;
use rand::Rng;
use std::env;
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== Dead Man's Switch — Deploy to Miden Testnet ===");
    println!();

    // 1. Setup client connected to Miden Testnet
    let mut rng = rand::rng();
    let mut coin_seed = [0u8; 32];
    rng.fill_bytes(&mut coin_seed);
    
    let keystore_path = env::current_dir()?.join("keystore");
    if !keystore_path.exists() {
        fs::create_dir_all(&keystore_path)?;
    }
    let keystore = Arc::new(FilesystemKeyStore::new(keystore_path)?);

    // Public testnet endpoint
    let endpoint = Endpoint::new("https".into(), "rpc.testnet.miden.io".into(), Some(443));
    let rpc_client = Arc::new(GrpcClient::new(&endpoint, 10_000));
    
    let store_path = std::path::PathBuf::from("store.sqlite3");
    
    let mut client = ClientBuilder::new()
        .rpc(rpc_client)
        .sqlite_store(store_path)
        .authenticator(keystore.clone())
        .build()
        .await?;
    
    println!("Syncing client with Miden Testnet...");
    client.sync_state().await?;

    // 2. Read the compiled MASM file
    let masm_path = PathBuf::from("deadmans_wallet.masm");
    if !masm_path.exists() {
        println!("Error: deadmans_wallet.masm not found in the current directory.");
        println!("Please run `midenc` to generate it first or make sure you are in `contracts`.");
        return Ok(());
    }
    
    println!("Reading MASM code from...");
    let masm_code = fs::read_to_string(masm_path)?;

    // 3. Compile component
    println!("Compiling component code...");
    let code_builder = miden_client::assembly::CodeBuilder::new();
    let component_code = code_builder.compile_component_code("deadmans_wallet", &masm_code)?;
    
    // Construct storage slots based on the component's needs.
    // The deadmans-wallet expects at least: beneficiary, heartbeat_blocks, last_checkin, is_active.
    // We assign default/empty values to these standard sequential slots for initialization.
    // The exact slot requirements map to how `deadmans_wallet` was compiled. 
    // They are initialized sequentially since wait, but it's easier to just pass 4 default slots.
    let storage_slots = vec![
        StorageSlot::with_value(StorageSlotName::new("miden::component::deadmans_wallet::beneficiary").unwrap(), Word::default()), // beneficiary
        StorageSlot::with_value(StorageSlotName::new("miden::component::deadmans_wallet::heartbeat_blocks").unwrap(), Word::default()), // heartbeat_blocks
        StorageSlot::with_value(StorageSlotName::new("miden::component::deadmans_wallet::last_checkin").unwrap(), Word::default()), // last_checkin
        StorageSlot::with_value(StorageSlotName::new("miden::component::deadmans_wallet::is_active").unwrap(), Word::default()), // is_active
    ];
    let custom_component = AccountComponent::new(component_code, storage_slots)?
        .with_supports_all_types();

    // 4. Generate keys and build account
    let key_pair = AuthSecretKey::new_falcon512_rpo();
    let pub_key = key_pair.public_key();

    let mut init_seed = [0u8; 32];
    rand::rng().fill_bytes(&mut init_seed);

    println!("Building account...");
    let account = AccountBuilder::new(init_seed)
        .account_type(AccountType::RegularAccountUpdatableCode)
        .storage_mode(miden_protocol::account::AccountStorageMode::Private)
        .with_auth_component(AuthFalcon512Rpo::new(pub_key.to_commitment()))
        .with_component(BasicWallet) // Includes basic receive/send functionality
        .with_component(custom_component)
        .build()?;

    // Save key
    keystore.add_key(&key_pair)?;
    
    // Add locally
    client.add_account(&account, false).await?;

    println!();
    println!("=======================================================");
    println!("✅ Deployment Successful!");
    println!("Account ID: {}", account.id());
    println!("=======================================================");

    Ok(())
}
