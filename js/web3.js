// ======================================================
// L3G3NDARY — Web3 Module
// Wallet connection, staking (Pass / L3G3NDS / Elite),
// live on-chain stats, contract copy helpers.
// Requires: ethers.js (global `ethers`), web3-config.js
// ======================================================

const l3gState = {
    isConnected: false,
    address: null,
    walletName: null,
    chainId: null,
    provider: null,
    signer: null,
    contracts: {
        token: null,
        passNFT: null,
        legendsNFT: null,
        eliteNFT: null,
        passStaking: null,
        legendsStaking: null,
        eliteStaking: null
    },
    data: {
        pass:    { balance: 0, staked: 0, pending: 0, stakes: [] },
        legends: { balance: 0, staked: 0, pending: 0, stakes: [] },
        elite:   { balance: 0, staked: [], pending: 0 }
    }
};

let l3gRpcIndex = 0;

// ======================================================
// UTIL
// ======================================================

function l3gShortAddress(addr) {
    if (!addr) return "";
    return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function l3gFormatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return Math.floor(num).toString();
}

function l3gShortError(error) {
    if (!error) return "Unknown error";
    if (error.reason) return error.reason;
    if (error.shortMessage) return error.shortMessage;
    if (error.code === "ACTION_REJECTED" || error.code === 4001) return "Request rejected";
    if (error.message) return error.message.slice(0, 140);
    return "Transaction failed";
}

function l3gNotify(message, type = "info") {

    document.querySelectorAll(".l3g-toast").forEach(t => t.remove());

    const toast = document.createElement("div");
    toast.className = `l3g-toast l3g-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 10);

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 400);
    }, 4500);

}

async function l3gCopyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        l3gNotify("Address copied", "success");
    } catch (err) {
        l3gNotify("Could not copy address", "error");
    }
}

function l3gIsMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// ======================================================
// READ-ONLY PROVIDER (for stats when wallet not connected)
// ======================================================

async function l3gGetReadProvider() {

    if (l3gState.provider) return l3gState.provider;

    for (let i = 0; i < L3G3NDARY_CONFIG.rpcEndpoints.length; i++) {

        const idx = (l3gRpcIndex + i) % L3G3NDARY_CONFIG.rpcEndpoints.length;
        const url = L3G3NDARY_CONFIG.rpcEndpoints[idx];

        try {
            const provider = new ethers.JsonRpcProvider(url);
            await provider.getBlockNumber();
            l3gRpcIndex = idx;
            return provider;
        } catch (e) {
            // try next endpoint
        }

    }

    throw new Error("All RPC endpoints failed");

}

// ======================================================
// LIVE STAKING STATS (works with or without wallet)
// ======================================================

async function l3gTryReadMethods(contract, methodNames) {

    for (const method of methodNames) {

        try {
            if (typeof contract[method] === "function") {
                const result = await contract[method]();
                if (result !== undefined && result !== null) return result;
            }
        } catch (e) {
            // this contract doesn't implement that method — try the next one
        }

    }

    return null;

}

async function l3gUpdateLiveStats() {

    const STAKED_METHODS = [
        "totalStaked",
        "totalStakedAmount",
        "stakedTotal",
        "getTotalStaked",
        "totalStakedNFTs",
        "stakedCount",
        "totalStakedTokens"
    ];

    try {

        const provider = await l3gGetReadProvider();

        const passStaking = new ethers.Contract(L3G3NDARY_CONFIG.staking.pass, L3G_STAKING_STATS_ABI, provider);
        const legendsStaking = new ethers.Contract(L3G3NDARY_CONFIG.staking.legends, L3G_STAKING_STATS_ABI, provider);
        const token = new ethers.Contract(L3G3NDARY_CONFIG.token, L3G_ERC20_ABI, provider);

        const [passTotalRaw, legendsTotalRaw] = await Promise.all([
            l3gTryReadMethods(passStaking, STAKED_METHODS),
            l3gTryReadMethods(legendsStaking, STAKED_METHODS)
        ]);

        // The remaining reward pool is simply the actual LGND balance the
        // staking contract currently holds — the most accurate number
        // available, independent of any assumptions about the ABI.
        const [passBalanceRaw, legendsBalanceRaw] = await Promise.all([
            token.balanceOf(L3G3NDARY_CONFIG.staking.pass).catch(() => null),
            token.balanceOf(L3G3NDARY_CONFIG.staking.legends).catch(() => null)
        ]);

        const passStaked = passTotalRaw !== null ? Number(passTotalRaw) : null;
        const legendsStaked = legendsTotalRaw !== null ? Number(legendsTotalRaw) : null;

        const stats = {
            totalStaked: (passStaked !== null && legendsStaked !== null) ? passStaked + legendsStaked : null,
            passRemaining: passBalanceRaw !== null ? Number(ethers.formatUnits(passBalanceRaw, 18)) : null,
            legendsRemaining: legendsBalanceRaw !== null ? Number(ethers.formatUnits(legendsBalanceRaw, 18)) : null
        };

        const totalEl = document.getElementById("statTotalStaked");
        const passEl = document.getElementById("statPassRemaining");
        const legendsEl = document.getElementById("statLegendsRemaining");

        if (stats.totalStaked !== null && totalEl) {
            totalEl.textContent = l3gFormatNumber(stats.totalStaked);
        }

        if (stats.passRemaining !== null && passEl) {
            passEl.textContent = l3gFormatNumber(stats.passRemaining) + " LGND";
        }

        if (stats.legendsRemaining !== null && legendsEl) {
            legendsEl.textContent = l3gFormatNumber(stats.legendsRemaining) + " LGND";
        }

        // Cache the last good reading so a temporary RPC hiccup doesn't
        // blank the numbers out for the visitor.
        if (stats.totalStaked !== null || stats.passRemaining !== null || stats.legendsRemaining !== null) {
            try {
                localStorage.setItem("l3gStatsCache", JSON.stringify(stats));
            } catch (e) {}
        }

    } catch (error) {

        console.warn("Live stats unavailable, falling back to cache:", error.message);

        try {

            const cached = JSON.parse(localStorage.getItem("l3gStatsCache"));

            if (cached) {

                const totalEl = document.getElementById("statTotalStaked");
                const passEl = document.getElementById("statPassRemaining");
                const legendsEl = document.getElementById("statLegendsRemaining");

                if (cached.totalStaked !== null && totalEl) totalEl.textContent = l3gFormatNumber(cached.totalStaked);
                if (cached.passRemaining !== null && passEl) passEl.textContent = l3gFormatNumber(cached.passRemaining) + " LGND";
                if (cached.legendsRemaining !== null && legendsEl) legendsEl.textContent = l3gFormatNumber(cached.legendsRemaining) + " LGND";

            }

        } catch (e) {}

    }

}

// ======================================================
// WALLET CONNECTION
// ======================================================

function l3gGetInjectedProvider() {

    if (typeof window.ethereum !== "undefined") return window.ethereum;
    if (typeof window.trustWallet !== "undefined") return window.trustWallet;
    if (typeof window.coinbaseWalletExtension !== "undefined") return window.coinbaseWalletExtension;
    return null;

}

function l3gDetectWalletName(injected) {

    if (!injected) return "Wallet";
    if (injected.isMetaMask) return "MetaMask";
    if (injected.isTrust) return "Trust Wallet";
    if (injected.isCoinbaseWallet) return "Coinbase Wallet";
    if (injected.isTokenPocket) return "TokenPocket";
    if (injected.isOKExWallet) return "OKX Wallet";
    return "Wallet";

}

async function l3gConnectWallet() {

    if (l3gState.isConnected) return;

    const injected = l3gGetInjectedProvider();

    if (!injected) {

        if (l3gIsMobile()) {
            l3gShowWalletModal();
            return;
        }

        l3gNotify("No wallet found — install MetaMask or another Ethereum wallet", "error");
        window.open("https://metamask.io/download/", "_blank");
        return;

    }

    try {

        const accounts = await injected.request({ method: "eth_requestAccounts" });

        if (!accounts || accounts.length === 0) throw new Error("No accounts returned");

        const provider = new ethers.BrowserProvider(injected);
        const signer = await provider.getSigner();
        const network = await provider.getNetwork();

        l3gState.isConnected = true;
        l3gState.address = accounts[0];
        l3gState.walletName = l3gDetectWalletName(injected);
        l3gState.provider = provider;
        l3gState.signer = signer;
        l3gState.chainId = Number(network.chainId);

        l3gInitContracts();
        l3gUpdateWalletUI();
        l3gToggleWalletPanels(true);

        l3gNotify(`${l3gState.walletName} connected`, "success");

        if (l3gState.chainId !== 1) {
            l3gNotify("Wrong network — please switch to Ethereum Mainnet", "warning");
        }

        await l3gLoadAllUserData();

    } catch (error) {
        console.error("Connect error:", error);
        l3gNotify(l3gShortError(error), "error");
    }

}

function l3gDisconnectWallet() {

    l3gState.isConnected = false;
    l3gState.address = null;
    l3gState.walletName = null;
    l3gState.provider = null;
    l3gState.signer = null;
    l3gState.chainId = null;

    l3gState.data = {
        pass:    { balance: 0, staked: 0, pending: 0, stakes: [] },
        legends: { balance: 0, staked: 0, pending: 0, stakes: [] },
        elite:   { balance: 0, staked: [], pending: 0 }
    };

    l3gUpdateWalletUI();
    l3gToggleWalletPanels(false);

    l3gNotify("Wallet disconnected", "info");

}

function l3gUpdateWalletUI() {

    const area = document.getElementById("walletArea");
    if (!area) return;

    if (l3gState.isConnected && l3gState.address) {

        area.innerHTML = `
            <div class="wallet-pill">
                <span class="wallet-dot"></span>
                <span class="wallet-address">${l3gShortAddress(l3gState.address)}</span>
                <button class="wallet-disconnect" id="disconnectWalletBtn" aria-label="Disconnect wallet">✕</button>
            </div>
        `;

        document.getElementById("disconnectWalletBtn").addEventListener("click", l3gDisconnectWallet);

    } else {

        area.innerHTML = `
            <button class="connect" id="connectWalletBtn">
                <span class="connect-full">Connect Wallet</span>
                <span class="connect-short">Connect</span>
            </button>
        `;

        document.getElementById("connectWalletBtn").addEventListener("click", l3gConnectWallet);

    }

}

function l3gToggleWalletPanels(connected) {

    document.querySelectorAll("[data-requires-wallet]").forEach(el => {
        el.style.display = connected ? "block" : "none";
    });

    document.querySelectorAll("[data-connect-prompt]").forEach(el => {
        el.style.display = connected ? "none" : "block";
    });

}

// ======================================================
// MOBILE WALLET MODAL
// ======================================================

function l3gShowWalletModal() {
    const modal = document.getElementById("walletModal");
    if (modal) modal.classList.add("open");
}

function l3gCloseWalletModal() {
    const modal = document.getElementById("walletModal");
    if (modal) modal.classList.remove("open");
}

function l3gWalletDeepLink(type) {

    const host = window.location.host + window.location.pathname;
    const dappUrl = encodeURIComponent(`https://${host}`);

    const links = {
        metamask:  `https://metamask.app.link/dapp/${host}`,
        trust:     `https://link.trustwallet.com/open_url?coin_id=60&url=${dappUrl}`,
        coinbase:  `https://go.cb-w.com/dapp?cb_url=${dappUrl}`,
        okx:       `https://www.okx.com/download?deeplink=dapp${dappUrl}`,
        tokenpocket: `https://tokenpocket.pro/dapp?url=${dappUrl}`
    };

    return links[type] || links.metamask;

}

function l3gConnectMobileWallet(type) {

    l3gCloseWalletModal();

    const injected = l3gGetInjectedProvider();

    if (injected) {
        l3gConnectWallet();
        return;
    }

    if (type === "walletconnect") {
        l3gNotify("Open your wallet app and use WalletConnect to scan", "info");
        window.open("https://walletconnect.com/", "_blank");
        return;
    }

    window.location.href = l3gWalletDeepLink(type);

}

// ======================================================
// CONTRACTS
// ======================================================

function l3gInitContracts() {

    const signer = l3gState.signer;
    if (!signer) return;

    l3gState.contracts.token = new ethers.Contract(L3G3NDARY_CONFIG.token, L3G_ERC20_ABI, signer);

    l3gState.contracts.passNFT = new ethers.Contract(L3G3NDARY_CONFIG.collections.pass, L3G_ERC1155_ABI, signer);
    l3gState.contracts.legendsNFT = new ethers.Contract(L3G3NDARY_CONFIG.collections.legends, L3G_ERC1155_ABI, signer);
    l3gState.contracts.eliteNFT = new ethers.Contract(L3G3NDARY_CONFIG.collections.elite, L3G_ELITE_NFT_ABI, signer);

    l3gState.contracts.passStaking = new ethers.Contract(L3G3NDARY_CONFIG.staking.pass, L3G_STAKING_ABI, signer);
    l3gState.contracts.legendsStaking = new ethers.Contract(L3G3NDARY_CONFIG.staking.legends, L3G_STAKING_ABI, signer);
    l3gState.contracts.eliteStaking = new ethers.Contract(L3G3NDARY_CONFIG.staking.elite, L3G_ELITE_STAKING_ABI, signer);

}

// ======================================================
// LOAD USER DATA
// ======================================================

async function l3gLoadAllUserData() {

    if (!l3gState.isConnected) return;

    await Promise.all([
        l3gLoadPoolData("pass"),
        l3gLoadPoolData("legends"),
        l3gLoadEliteData()
    ]);

}

async function l3gLoadPoolData(kind) {

    try {

        const nft = kind === "pass" ? l3gState.contracts.passNFT : l3gState.contracts.legendsNFT;
        const staking = kind === "pass" ? l3gState.contracts.passStaking : l3gState.contracts.legendsStaking;
        const user = l3gState.address;

        const [balance, pending, stakes] = await Promise.all([
            nft.balanceOf(user, 1).catch(() => 0n),
            staking.pendingRewards(user).catch(() => 0n),
            staking.getUserStakes(user).catch(() => [])
        ]);

        const stakedTotal = stakes.reduce((sum, s) => sum + Number(s.amount), 0);

        l3gState.data[kind] = {
            balance: Number(balance),
            staked: stakedTotal,
            pending: Number(ethers.formatUnits(pending, 18)),
            stakes: stakes
        };

        l3gRenderPoolData(kind);

    } catch (error) {
        console.warn(`Load ${kind} data failed:`, error.message);
    }

}

function l3gRenderPoolData(kind) {

    const d = l3gState.data[kind];

    const set = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    set(`${kind}WalletBalance`, d.balance);
    set(`${kind}StakedCount`, d.staked);
    set(`${kind}PendingRewards`, d.pending.toFixed(2) + " LGND");

}

async function l3gLoadEliteData() {

    try {

        const nft = l3gState.contracts.eliteNFT;
        const staking = l3gState.contracts.eliteStaking;
        const user = l3gState.address;

        const [balance, stakedTokens, pending] = await Promise.all([
            nft.balanceOf(user).catch(() => 0n),
            staking.getUserStakedTokens(user).catch(() => []),
            staking.getPendingRewards(user).catch(() => 0n)
        ]);

        l3gState.data.elite = {
            balance: Number(balance),
            staked: stakedTokens.map(t => Number(t)),
            pending: Number(ethers.formatUnits(pending, 18))
        };

        const set = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        set("eliteWalletBalance", l3gState.data.elite.balance);
        set("eliteStakedCount", l3gState.data.elite.staked.length);
        set("elitePendingRewards", l3gState.data.elite.pending.toFixed(2) + " LGND");

        const select = document.getElementById("eliteUnstakeSelect");

        if (select) {

            select.innerHTML = "";

            if (l3gState.data.elite.staked.length === 0) {
                select.innerHTML = `<option value="">No staked NFTs</option>`;
            } else {
                l3gState.data.elite.staked.forEach(id => {
                    const opt = document.createElement("option");
                    opt.value = id;
                    opt.textContent = `Elite #${id}`;
                    select.appendChild(opt);
                });
            }

        }

    } catch (error) {
        console.warn("Load elite data failed:", error.message);
    }

}

// ======================================================
// STAKE / UNSTAKE / CLAIM — Pass & L3G3NDS (ERC-1155)
// ======================================================

async function l3gStakePool(kind) {

    if (!l3gState.isConnected) { await l3gConnectWallet(); return; }

    const input = document.getElementById(`${kind}StakeAmount`);
    const btn = document.getElementById(`${kind}StakeBtn`);
    const amount = parseInt(input.value, 10);

    if (!amount || amount < 1) {
        l3gNotify("Enter a valid amount", "warning");
        return;
    }

    if (amount > l3gState.data[kind].balance) {
        l3gNotify("Insufficient NFT balance", "error");
        return;
    }

    const original = btn.textContent;
    btn.disabled = true;

    try {

        const nft = kind === "pass" ? l3gState.contracts.passNFT : l3gState.contracts.legendsNFT;
        const stakingAddress = kind === "pass" ? L3G3NDARY_CONFIG.staking.pass : L3G3NDARY_CONFIG.staking.legends;
        const staking = kind === "pass" ? l3gState.contracts.passStaking : l3gState.contracts.legendsStaking;

        const isApproved = await nft.isApprovedForAll(l3gState.address, stakingAddress);

        if (!isApproved) {
            btn.textContent = "Approving…";
            const approveTx = await nft.setApprovalForAll(stakingAddress, true);
            await approveTx.wait();
        }

        btn.textContent = "Staking…";
        const tx = await staking.stake(1, amount);
        await tx.wait();

        l3gNotify(`Staked ${amount} NFT${amount > 1 ? "s" : ""}`, "success");
        input.value = "";

        await l3gLoadPoolData(kind);
        await l3gUpdateLiveStats();

    } catch (error) {
        console.error(error);
        l3gNotify(l3gShortError(error), "error");
    } finally {
        btn.disabled = false;
        btn.textContent = original;
    }

}

async function l3gClaimPool(kind) {

    if (!l3gState.isConnected) { await l3gConnectWallet(); return; }

    if (l3gState.data[kind].pending <= 0) {
        l3gNotify("No rewards to claim yet", "warning");
        return;
    }

    const btn = document.getElementById(`${kind}ClaimBtn`);
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Claiming…";

    try {

        const staking = kind === "pass" ? l3gState.contracts.passStaking : l3gState.contracts.legendsStaking;
        const tx = await staking.claimRewards();
        await tx.wait();

        l3gNotify("Rewards claimed", "success");

        await l3gLoadPoolData(kind);

    } catch (error) {
        console.error(error);
        l3gNotify(l3gShortError(error), "error");
    } finally {
        btn.disabled = false;
        btn.textContent = original;
    }

}

function l3gOpenUnstakeModal(kind) {

    if (!l3gState.isConnected) { l3gConnectWallet(); return; }

    const stakes = l3gState.data[kind].stakes;

    if (!stakes || stakes.length === 0) {
        l3gNotify("You have no active stakes here", "warning");
        return;
    }

    const overlay = document.createElement("div");
    overlay.className = "l3g-modal-overlay open";

    const label = kind === "pass" ? "L3G3NDARY Pass" : "L3G3NDS";

    let rows = "";

    stakes.forEach((s, index) => {
        const date = new Date(Number(s.stakedAt) * 1000);
        rows += `
            <button class="l3g-stake-row" data-index="${index}">
                <span>Amount: <strong>${Number(s.amount)}</strong></span>
                <span class="l3g-stake-date">Staked ${date.toLocaleDateString()}</span>
            </button>
        `;
    });

    overlay.innerHTML = `
        <div class="l3g-modal">
            <button class="l3g-modal-close" aria-label="Close">✕</button>
            <h3>Unstake ${label}</h3>
            <div class="l3g-stake-list">${rows}</div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector(".l3g-modal-close").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelectorAll(".l3g-stake-row").forEach(row => {
        row.addEventListener("click", async () => {

            const index = row.dataset.index;
            row.innerHTML = "<span>Unstaking…</span>";

            try {

                const staking = kind === "pass" ? l3gState.contracts.passStaking : l3gState.contracts.legendsStaking;
                const tx = await staking.unstake(index);
                await tx.wait();

                l3gNotify("Unstaked successfully", "success");
                overlay.remove();

                await l3gLoadPoolData(kind);
                await l3gUpdateLiveStats();

            } catch (error) {
                console.error(error);
                l3gNotify(l3gShortError(error), "error");
                overlay.remove();
            }

        });
    });

}

// ======================================================
// STAKE / UNSTAKE / CLAIM — Elite (ERC-721, per token ID)
// ======================================================

async function l3gEliteStake() {

    if (!l3gState.isConnected) { await l3gConnectWallet(); return; }

    const input = document.getElementById("eliteTokenIdInput");
    const btn = document.getElementById("eliteStakeBtn");
    const tokenId = input.value;

    if (!tokenId || Number(tokenId) <= 0) {
        l3gNotify("Enter a valid Elite Token ID", "warning");
        return;
    }

    const original = btn.textContent;
    btn.disabled = true;

    try {

        const nft = l3gState.contracts.eliteNFT;
        const staking = l3gState.contracts.eliteStaking;

        const owner = await nft.ownerOf(tokenId);

        if (owner.toLowerCase() !== l3gState.address.toLowerCase()) {
            l3gNotify("You don't own this Elite NFT", "error");
            return;
        }

        const approved = await nft.getApproved(tokenId);

        if (approved.toLowerCase() !== L3G3NDARY_CONFIG.staking.elite.toLowerCase()) {
            btn.textContent = "Approving…";
            const approveTx = await nft.approve(L3G3NDARY_CONFIG.staking.elite, tokenId);
            await approveTx.wait();
        }

        btn.textContent = "Staking…";
        const tx = await staking.stake(tokenId);
        await tx.wait();

        l3gNotify(`Elite #${tokenId} staked`, "success");
        input.value = "";

        await l3gLoadEliteData();
        await l3gUpdateLiveStats();

    } catch (error) {
        console.error(error);
        l3gNotify(l3gShortError(error), "error");
    } finally {
        btn.disabled = false;
        btn.textContent = original;
    }

}

async function l3gEliteUnstake() {

    if (!l3gState.isConnected) { await l3gConnectWallet(); return; }

    const select = document.getElementById("eliteUnstakeSelect");
    const btn = document.getElementById("eliteUnstakeBtn");
    const tokenId = select.value;

    if (!tokenId) {
        l3gNotify("Select an Elite NFT to unstake", "warning");
        return;
    }

    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Unstaking…";

    try {

        const tx = await l3gState.contracts.eliteStaking.unstake(tokenId);
        await tx.wait();

        l3gNotify(`Elite #${tokenId} unstaked`, "success");

        await l3gLoadEliteData();
        await l3gUpdateLiveStats();

    } catch (error) {
        console.error(error);
        l3gNotify(l3gShortError(error), "error");
    } finally {
        btn.disabled = false;
        btn.textContent = original;
    }

}

async function l3gEliteClaim() {

    if (!l3gState.isConnected) { await l3gConnectWallet(); return; }

    if (l3gState.data.elite.pending <= 0) {
        l3gNotify("No rewards to claim yet", "warning");
        return;
    }

    const btn = document.getElementById("eliteClaimBtn");
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Claiming…";

    try {

        const tx = await l3gState.contracts.eliteStaking.claimRewards();
        await tx.wait();

        l3gNotify("Elite rewards claimed", "success");

        await l3gLoadEliteData();

    } catch (error) {
        console.error(error);
        l3gNotify(l3gShortError(error), "error");
    } finally {
        btn.disabled = false;
        btn.textContent = original;
    }

}

// ======================================================
// INIT
// ======================================================

function l3gSetupWeb3UI() {

    l3gUpdateWalletUI();
    l3gToggleWalletPanels(false);

    document.getElementById("passStakeBtn")?.addEventListener("click", () => l3gStakePool("pass"));
    document.getElementById("passUnstakeBtn")?.addEventListener("click", () => l3gOpenUnstakeModal("pass"));
    document.getElementById("passClaimBtn")?.addEventListener("click", () => l3gClaimPool("pass"));

    document.getElementById("legendsStakeBtn")?.addEventListener("click", () => l3gStakePool("legends"));
    document.getElementById("legendsUnstakeBtn")?.addEventListener("click", () => l3gOpenUnstakeModal("legends"));
    document.getElementById("legendsClaimBtn")?.addEventListener("click", () => l3gClaimPool("legends"));

    document.getElementById("eliteStakeBtn")?.addEventListener("click", l3gEliteStake);
    document.getElementById("eliteUnstakeBtn")?.addEventListener("click", l3gEliteUnstake);
    document.getElementById("eliteClaimBtn")?.addEventListener("click", l3gEliteClaim);

    document.querySelectorAll("[data-connect-prompt]").forEach(btn => {
        btn.addEventListener("click", l3gConnectWallet);
    });

    document.getElementById("walletModalClose")?.addEventListener("click", l3gCloseWalletModal);

    document.querySelectorAll("[data-wallet-option]").forEach(btn => {
        btn.addEventListener("click", () => l3gConnectMobileWallet(btn.dataset.walletOption));
    });

    document.querySelectorAll("[data-copy-address]").forEach(btn => {
        btn.addEventListener("click", () => l3gCopyText(btn.dataset.copyAddress));
    });

    if (window.ethereum) {

        window.ethereum.on("accountsChanged", async (accounts) => {
            if (accounts.length === 0) {
                l3gDisconnectWallet();
            } else if (l3gState.isConnected) {
                l3gState.address = accounts[0];
                l3gUpdateWalletUI();
                await l3gLoadAllUserData();
            }
        });

        window.ethereum.on("chainChanged", () => {
            window.location.reload();
        });

    }

    l3gUpdateLiveStats();
    setInterval(l3gUpdateLiveStats, 30000);

}

document.addEventListener("DOMContentLoaded", l3gSetupWeb3UI);
