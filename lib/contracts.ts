// -------------------- Config --------------------
export const CONTRACTS = {
    coston2: {
        VaultFactory: "0x71185A25db74E47F3a1e13b5ab112D3834B58e66" as `0x${string}`,
        USDTToken: "0xC1A5B41512496B80903D1f32d6dEa3a73212E71F" as `0x${string}`,
    },
} as const;

export const KINETIC_CONTRACTS = {
    kUSDT0: "0x2585093A4EABF872fA9E313b66f0B12Ed38954Cf",
    kUSDC: "0xC23B7fbE7CdAb4bf524b8eA72a7462c8879A99Ac",
    kSFLR: "0x060573e5f5Aa157B2eAa5eeDBef40605ac3bDEFe",
    kWETH: "0x9c6bf326fCF1A533AaC0e7289332f4Cb74526EE6",
    Comptroller: "0xeC7e541375D70c37262f619162502dB9131d6db5",
} as const;

export const TOKEN_DECIMALS = {
    USDT0: 6,
    USDC: 6,
    SFLR: 18,
    WETH: 18,
};

// Maximum uint256 for approvals
export const MAX_UINT256 = BigInt(
    "115792089237316195423570985008687907853269984665640564039457584007913129639935"
);

// -------------------- VaultFactory ABI --------------------
export const VAULT_FACTORY_ABI = [
    {
        inputs: [
            { name: "_purpose", type: "string" },
            { name: "_unlockTimestamp", type: "uint256" },
            { name: "_penaltyBps", type: "uint256" },
            { name: "_initialDeposit", type: "uint256" }
        ],
        name: "createPersonalVault",
        outputs: [{ name: "", type: "address" }],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [],
        name: "usdtToken",
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [{ name: "user", type: "address" }],
        name: "getUserVaults",
        outputs: [{ name: "", type: "address[]" }],
        stateMutability: "view",
        type: "function"
    }
] as const;

// -------------------- Vault ABI --------------------
export const VAULT_ABI = [
    {
        inputs: [],
        name: "purpose",
        outputs: [{ name: "", type: "string" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "totalAssets",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "unlockTimestamp",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "token",
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [{ name: "amount", type: "uint256" }],
        name: "deposit",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [],
        name: "withdraw",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    }
] as const;

// -------------------- ERC20 ABI --------------------
export const ERC20_ABI = [
    {
        inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" }
        ],
        name: "approve",
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" }
        ],
        name: "allowance",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [{ name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "decimals",
        outputs: [{ name: "", type: "uint8" }],
        stateMutability: "view",
        type: "function"
    }
] as const;

// -------------------- Kinetic ABI --------------------
export const KINETIC_ERC20_ABI = [
    ...ERC20_ABI,
    {
        inputs: [{ name: "amount", type: "uint256" }],
        name: "mint",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [],
        name: "underlying",
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [{ name: "amount", type: "uint256" }],
        name: "redeem",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "nonpayable",
        type: "function"
    }
] as const;

// -------------------- Kinetic Comptroller ABI --------------------
export const COMPTROLLER_ABI = [
    {
        inputs: [{ name: "kTokens", type: "address[]" }],
        name: "enterMarkets",
        outputs: [{ name: "", type: "uint256[]" }],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [
            { name: "account", type: "address" },
            { name: "kToken", type: "address" }
        ],
        name: "checkMembership",
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "view",
        type: "function"
    }
] as const;
