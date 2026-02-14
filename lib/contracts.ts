// -------------------- Config --------------------
export const CONTRACTS = {
    coston2: {
        VaultFactory: "0xfB3e3fc852a2178061F44C5FBd6D3b662c278b0d" as `0x${string}`,
        USDTToken: "0xC1A5B41512496B80903D1f32d6dEa3a73212E71F" as `0x${string}`,
    },
} as const;

export const VAULT_FACTORY_ABI = [
    {
        inputs: [
            { name: "_purpose", type: "string" },
            { name: "_unlockTimestamp", type: "uint256" },
            { name: "_penaltyBps", type: "uint256" },
            { name: "_initialDeposit", type: "uint256" },
            { name: "_beneficiary", type: "address" }
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
    },
    {
        inputs: [],
        name: "getAllVaults",
        outputs: [{ name: "", type: "address[]" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "owner",
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [{ name: "_vault", type: "address" }],
        name: "triggerBeneficiaryClaim",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [
            { name: "_vault", type: "address" },
            { name: "_amount", type: "uint256" }
        ],
        name: "executeAutoDeposit",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    }
] as const;

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
    },
    {
        inputs: [],
        name: "beneficiary",
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "GRACE_PERIOD",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "claimByBeneficiary",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [{ name: "amount", type: "uint256" }],
        name: "depositFromFactory",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    }
] as const;

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
    },
    {
        inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" }
        ],
        name: "mint",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    }
] as const;
