#!/bin/bash

# HookSwap - Token-2022 AMM Deployment Script
# This script automates the deployment of both the AMM and Hook programs

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v anchor &> /dev/null; then
        print_error "Anchor CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v solana &> /dev/null; then
        print_error "Solana CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install it first."
        exit 1
    fi
    
    print_success "All dependencies are installed"
}

# Get deployment configuration
get_deployment_config() {
    print_status "Getting deployment configuration..."
    
    # Get current cluster
    CLUSTER=$(solana config get | grep "RPC URL" | awk '{print $3}')
    
    if [[ $CLUSTER == *"devnet"* ]]; then
        CLUSTER_NAME="devnet"
        print_status "Deploying to devnet"
    elif [[ $CLUSTER == *"mainnet"* ]]; then
        CLUSTER_NAME="mainnet-beta"
        print_warning "Deploying to mainnet-beta - ensure you have tested thoroughly!"
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Deployment cancelled"
            exit 0
        fi
    else
        CLUSTER_NAME="localnet"
        print_status "Deploying to localnet"
    fi
    
    # Get wallet
    WALLET=$(solana config get | grep "Keypair Path" | awk '{print $3}')
    if [ -z "$WALLET" ]; then
        print_error "No wallet configured. Please run 'solana config set --keypair <path>'"
        exit 1
    fi
    
    print_success "Using wallet: $WALLET"
    print_success "Target cluster: $CLUSTER_NAME"
}

# Build programs
build_programs() {
    print_status "Building programs..."
    
    # Build AMM program
    print_status "Building AMM program..."
    cd programs
    anchor build
    cd ..
    
    # Build Hook program
    print_status "Building Hook program..."
    cd hook
    anchor build
    cd ..
    
    print_success "All programs built successfully"
}

# Deploy AMM program
deploy_amm() {
    print_status "Deploying AMM program..."
    
    cd programs
    
    # Deploy
    anchor deploy --provider.cluster $CLUSTER_NAME
    
    # Get program ID
    AMM_PROGRAM_ID=$(solana address -k target/deploy/amm-keypair.json)
    print_success "AMM program deployed: $AMM_PROGRAM_ID"
    
    cd ..
}

# Deploy Hook program
deploy_hook() {
    print_status "Deploying Hook program..."
    
    cd hook
    
    # Deploy
    anchor deploy --provider.cluster $CLUSTER_NAME
    
    # Get program ID
    HOOK_PROGRAM_ID=$(solana address -k target/deploy/hook-keypair.json)
    print_success "Hook program deployed: $HOOK_PROGRAM_ID"
    
    cd ..
}

# Update configuration files
update_config() {
    print_status "Updating configuration files..."
    
    # Update Anchor.toml
    if [ -f "Anchor.toml" ]; then
        sed -i.bak "s/amm = \".*\"/amm = \"$AMM_PROGRAM_ID\"/" Anchor.toml
        sed -i.bak "s/hook = \".*\"/hook = \"$HOOK_PROGRAM_ID\"/" Anchor.toml
        print_success "Updated Anchor.toml"
    fi
    
    # Update frontend configuration
    if [ -f "hookswap/lib/anchor.ts" ]; then
        sed -i.bak "s/AMM_PROGRAM_ID = \".*\"/AMM_PROGRAM_ID = \"$AMM_PROGRAM_ID\"/" hookswap/lib/anchor.ts
        sed -i.bak "s/HOOK_PROGRAM_ID = \".*\"/HOOK_PROGRAM_ID = \"$HOOK_PROGRAM_ID\"/" hookswap/lib/anchor.ts
        print_success "Updated frontend configuration"
    fi
    
    # Create deployment info file
    cat > deployment-info.txt << EOF
HookSwap Deployment Information
===============================

Deployment Date: $(date)
Cluster: $CLUSTER_NAME
Wallet: $WALLET

Program IDs:
- AMM Program: $AMM_PROGRAM_ID
- Hook Program: $HOOK_PROGRAM_ID

Next Steps:
1. Initialize the hook program settings
2. Create KYC accounts for users
3. Set transfer limits for tokens
4. Start the frontend application

Commands:
- Initialize hook: cd hook && anchor test --skip-local-validator
- Start frontend: cd hookswap && yarn dev
EOF
    
    print_success "Deployment information saved to deployment-info.txt"
}

# Initialize hook program
initialize_hook() {
    print_status "Initializing hook program..."
    
    cd hook
    
    # Run initialization test
    anchor test --skip-local-validator || {
        print_warning "Hook initialization failed. You may need to initialize manually."
        print_status "Run: anchor test --skip-local-validator"
    }
    
    cd ..
}

# Install frontend dependencies
setup_frontend() {
    print_status "Setting up frontend..."
    
    cd hookswap
    
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        yarn install
    fi
    
    print_success "Frontend setup complete"
    cd ..
}

# Main deployment function
main() {
    echo "🚀 HookSwap - Token-2022 AMM Deployment"
    echo "========================================"
    echo
    
    # Check dependencies
    check_dependencies
    
    # Get configuration
    get_deployment_config
    
    # Build programs
    build_programs
    
    # Deploy programs
    deploy_amm
    deploy_hook
    
    # Update configuration
    update_config
    
    # Initialize hook
    initialize_hook
    
    # Setup frontend
    setup_frontend
    
    echo
    echo "🎉 Deployment completed successfully!"
    echo
    echo "Program IDs:"
    echo "- AMM: $AMM_PROGRAM_ID"
    echo "- Hook: $HOOK_PROGRAM_ID"
    echo
    echo "Next steps:"
    echo "1. Review deployment-info.txt for details"
    echo "2. Start the frontend: cd hookswap && yarn dev"
    echo "3. Visit http://localhost:3000 to use the application"
    echo
    echo "Happy swapping! 🪝"
}

# Run main function
main "$@"
