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


//   it("Should allow adding liquidity", async function () {
    
   
//     // 用户给 Swap 合约授权 TokenA 和 TokenB
//     await tokenA.approve(Swap.target, 10000);
//     await tokenB.approve(Swap.target, 10000);
    
//     // 添加流动性：100 TokenA + 1000 TokenB
//     await expect(swap.addLiquidity(100, 200))
//       .to.emit(swap, "LiquidityAdded")
//       .withArgs(owner.address, 100, 200, ethers.toBigInt(141)); // LP tokens 简化为固定值
    
//     // 检查总流动性
//     expect(await swap.totalLiquidityTokenA()).to.equal(ethers.toBigInt(100));
//     expect(await swap.totalLiquidityTokenB()).to.equal(ethers.toBigInt(200));
//     expect(await swap.totalLPTokens()).to.be.gt(0); // 至少有 LP tokens
//   });

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

    it("S")
});