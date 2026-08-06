// ======================================================
// L3G3NDARY — Web3 Configuration
// Real contract addresses, ABIs and external links.
// Carried over from the legacy production site.
// ======================================================

const L3G3NDARY_CONFIG = {

    website: "https://l3g3ndary.com",

    // ---------- Core contracts ----------
    token: "0x8BFB4cEdd7776AF70E61740aB8d44F8643E55b30",

    collections: {
        pass:   "0x1bC5f738b2dad5aDBaB624F82223B2d5c789EFD8",
        legends:"0xC8b2276d2B6814Ca79AA81cdECCb6D65A684b501",
        elite:  "0x18Bf70e35861AD9E59207828E38ee751DdC0b458",
        agc:    "0x4d9E6d139390e023210B1b1426d7f08e27B5F5b1",
        mosaics:"0x2F0132700CABAb5B736c9e2D19Ff0a4acfca6831"
    },

    staking: {
        pass:   "0xd6155A5dAb72E332A29574c1f6C56F8ba7EF1378",
        legends:"0x3E80ab8077dE0B6ccB28365e152440C4ED9Caa52",
        elite:  "0xC95FC3701b912c178EC907e876b6217bDF545a3E"
    },

    liquidityPool:  "0x52BEa360319c9e34c197BA9D6132a6f1DB17A6A6",
    projectWallet:  "0x39F2e6f3381B04eea73Eb02DCAe8B379B5F25cDc",
    airdrop:        "0x78d2446995d2535F66dabB5cE5cf8A60D13270cd",

    rewards: {
        pass:    { total: 500000000, dailyPerNFT: 2500 },
        legends: { total: 150000000, dailyPerNFT: 1000 },
        elite:   { dailyPerNFT: 777 }
    },

    // ---------- Proof of renouncement ----------
    renounceTx: {
        token:   "0xf48b6aecaa57ac8a87ad7de60b719853ddddbb79e965af7f53f19fa61a5db443",
        legends: "0xc8ab88a4894ed0939b60d88914e6ac9441cea40dec69c311b3d6f6af9c3bdebe",
        pass:    "0x4a1ad3dfc36fd94e758c68ce7028133c925289fdc575634b5e46d09f8532110a"
    },

    // ---------- External links ----------
    links: {
        openseaPass:    "https://opensea.io/collection/l3g3ndary-pass",
        openseaLegends: "https://opensea.io/collection/l3g3nds-317620434",
        openseaElite:   "https://opensea.io/collection/l3g3ndary-elite",
        openseaAGC:     "https://opensea.io/collection/l3g3ndary-ancient-greek-coin-collection",
        openseaMosaics: "https://opensea.io/collection/ai-mosaics-l3g3nds-746988781",
        coinGalleryProfile: "https://opensea.io/Ancient_Greek_Coin_Gallery",
        dextools:       "https://www.dextools.io/app/ether/pair-explorer/0x52bea360319c9e34c197ba9d6132a6f1db17a6a6",
        sablierLock:    "https://app.sablier.com/vesting/create?shape=linearTimelock",
        telegramAnnouncements: "https://t.me/l3g3ndarycoin",
        telegramChat:   "https://t.me/L3G3NDARYCommunity",
        twitter:        "https://x.com/l3g3ndary_dep",
        discord:        "https://discord.gg/FXHpdqeqDr",
        linkedin:       "https://www.linkedin.com/in/3g3ndary/",
        medium:         "https://medium.com/@l3g3ndarydep"
    },

    // ---------- Read-only RPC fallbacks (used when wallet is not connected) ----------
    rpcEndpoints: [
        "https://eth.llamarpc.com",
        "https://rpc.ankr.com/eth",
        "https://eth-mainnet.public.blastapi.io",
        "https://cloudflare-eth.com",
        "https://ethereum.publicnode.com"
    ]

};

function l3gEtherscanAddress(address) {
    return "https://etherscan.io/address/" + address;
}

function l3gEtherscanToken(address) {
    return "https://etherscan.io/token/" + address;
}

function l3gEtherscanTx(hash) {
    return "https://etherscan.io/tx/" + hash;
}

// ======================================================
// ABIs
// ======================================================

const L3G_ERC1155_ABI = [
    "function balanceOf(address account, uint256 id) view returns (uint256)",
    "function isApprovedForAll(address account, address operator) view returns (bool)",
    "function setApprovalForAll(address operator, bool approved)"
];

const L3G_STAKING_ABI = [
    "function stake(uint256 tokenId, uint256 amount) external",
    "function unstake(uint256 stakeIndex) external",
    "function claimRewards() external",
    "function getUserStakes(address user) view returns ((uint256 tokenId, uint256 amount, uint256 stakedAt)[])",
    "function pendingRewards(address user) view returns (uint256)",
    "function totalStakedAmount() view returns (uint256)",
    "function totalRewardsDistributed() view returns (uint256)"
];

const L3G_ELITE_STAKING_ABI = [
    "function stake(uint256 tokenId) external",
    "function unstake(uint256 tokenId) external",
    "function claimRewards() external",
    "function getUserStakedTokens(address user) view returns (uint256[])",
    "function getPendingRewards(address user) view returns (uint256)"
];

const L3G_ELITE_NFT_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function getApproved(uint256 tokenId) view returns (address)",
    "function approve(address to, uint256 tokenId)"
];

const L3G_ERC20_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
];

// Candidate read methods for "total NFTs staked" — different staking
// contract deployments name this differently, so we probe for whichever
// one the live contract actually implements.
const L3G_STAKING_STATS_ABI = [
    "function totalStaked() view returns (uint256)",
    "function totalStakedAmount() view returns (uint256)",
    "function stakedTotal() view returns (uint256)",
    "function getTotalStaked() view returns (uint256)",
    "function totalStakedNFTs() view returns (uint256)",
    "function stakedCount() view returns (uint256)",
    "function totalStakedTokens() view returns (uint256)"
];
