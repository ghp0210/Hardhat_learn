import { ethers } from "hardhat";
import { expect } from "chai";

describe("SimpleSwap Test", function () {
  let TokenA: any;
  let TokenB: any;
  let Swap: any;

  let tokenA: any;
  let tokenB: any;
  let swap: any;

  let owner: any;
  let user: any;

  before(async function () {
    
    
    [owner, user] = await ethers.getSigners();
    console.log("已获取签名者");  // 新增的调试输出

    // 部署 TokenA (FirstToken)
    const FirstTokenFactory = await ethers.getContractFactory("TokenA");
    TokenA = await FirstTokenFactory.deploy(10000);
    await TokenA.waitForDeployment();
    const tokenAAddress = await TokenA.getAddress();
    console.log("TokenA 已部署到:", tokenAAddress);
    
    // 部署 TokenB (SecondToken)
    const SecondTokenFactory = await ethers.getContractFactory("TokenB");
    TokenB = await SecondTokenFactory.deploy(100000);
    await TokenB.waitForDeployment();
    const tokenBAddress = await TokenB.getAddress();
    console.log("TokenB 已部署到:", tokenBAddress);
    
    // 部署 SimpleSwap，传入 TokenA 和 TokenB 的地址
    const SwapFactory = await ethers.getContractFactory("SimpleSwap");
    Swap = await SwapFactory.deploy(tokenAAddress, tokenBAddress);
    await Swap.waitForDeployment();
    const swapAddress = await Swap.getAddress();
    console.log("SimpleSwap 已部署到:", swapAddress);
    
    if (!swapAddress) {
      throw new Error("SimpleSwap 部署失败，未返回有效地址");
    }

    // 获取合约实例（用于调用方法）
    tokenA = TokenA.connect(owner);
    tokenB = TokenB.connect(owner);
    swap = Swap.connect(owner);
    
    console.log("所有合约部署完成");  // 新增的调试输出

  });


  it("Should allow adding liquidity", async function () {
    
   
    // 用户给 Swap 合约授权 TokenA 和 TokenB
    await tokenA.approve(Swap.target, 10000);
    await tokenB.approve(Swap.target, 10000);
    
    // 添加流动性：100 TokenA + 200 TokenB
    await expect(swap.addLiquidity(100, 200))
      .to.emit(swap, "LiquidityAdded")
      .withArgs(owner.address, 100, 200, ethers.toBigInt(141)); // LP tokens 简化为固定值
    const expectedLPTokens = ethers.toBigInt(141);
    // 检查总流动性
    expect(await swap.totalLiquidityTokenA()).to.equal(ethers.toBigInt(100));
    expect(await swap.totalLiquidityTokenB()).to.equal(ethers.toBigInt(200));
    expect(await swap.totalLPTokens()).to.be.gt(0); // 至少有 LP tokens
    // 检查流动性提供者的LP tokens
    expect(await swap.liquidityProvider(owner.address)).to.equal(expectedLPTokens);
  });

    it("Should Transfer", async function () {
    // 1. 获取 user 的初始 TokenA 余额
    const initialBalance = await tokenA.balanceOf(user.address);
    console.log(initialBalance);

    // 2. owner 给 user 转账 1000 TokenA
    await tokenA.transfer(user.address, 1000);

    // 3. 获取转账后的余额
    const newBalance = await tokenA.balanceOf(user.address);
    console.log(newBalance);

    expect(newBalance).to.equal(initialBalance + ethers.toBigInt(1000));


    });

    it("Should Swap",async function(){
        // 用户授权 TokenA 给 Swap 合约
        await tokenA.connect(user).approve(swap.target, 1000);

        // 获取用户初始 TokenA 和 TokenB 的余额
        const initialBalance_A = await tokenA.balanceOf(user.address);
        const initialBalance_B = await tokenB.balanceOf(user.address);
        console.log("初始 TokenB 余额:", initialBalance_B.toString());

        // 用户用 100 TokenA 兑换成 TokenB
        await swap.connect(user).swap(tokenA.target, 100);
        
        // 获取兑换后的余额
        const newBalance_A = await tokenA.balanceOf(user.address);
        const newBalance_B = await tokenB.balanceOf(user.address);

        console.log("兑换后 TokenA 余额:", newBalance_A.toString());
        console.log("兑换后 TokenB 余额:", newBalance_B.toString());

        // 验证 TokenA 减少（考虑授权转账）
        expect(newBalance_A).to.be.lt(initialBalance_A);

        // 验证 TokenB 增加
        expect(newBalance_B).to.be.gt(initialBalance_B);
    })

    it("Should allow removing liquidity", async function () {
    // 假设 owner 之前添加了 100 TokenA 和 200 TokenB，获得了一些 LP tokens
    const lpTokensBefore = await swap.liquidityProvider(owner.address);
    console.log("流动性",lpTokensBefore)
    // 移除所有流动性
    await expect(swap.connect(owner).removeLiquidity(lpTokensBefore))
      .to.emit(swap, "LiquidityRemoved")
      .withArgs(owner.address, ethers.toBigInt(200), ethers.toBigInt(101), lpTokensBefore);

    // 检查池子是否清空
    expect(await swap.totalLiquidityTokenA()).to.equal(ethers.toBigInt(0));
    expect(await swap.totalLiquidityTokenB()).to.equal(ethers.toBigInt(0));
    expect(await swap.totalLPTokens()).to.equal(0);

    // 检查 owner 是否收到了 TokenA 和 TokenB
    const ownerTokenABalance = await tokenA.balanceOf(owner.address);
    const ownerTokenBBalance = await tokenB.balanceOf(owner.address);
    expect(ownerTokenABalance).to.be.gt(0);
    expect(ownerTokenBBalance).to.be.gt(0);
  });
});