import { ethers } from "hardhat";
import { expect, should } from "chai";

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

    // 部署 TokenA 
    const TokenFactory = await ethers.getContractFactory("MyToken");
    TokenA = await TokenFactory.deploy("TokenA", "TKA", 10000);
    await TokenA.waitForDeployment();
    const tokenAAddress = await TokenA.getAddress();
    console.log("TokenA 已部署到:", tokenAAddress);

    // 部署 TokenB (SecondToken)
    TokenB = await TokenFactory.deploy("TokenB","TKB",10000);
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
    console.log("所有合约部署完成");  

  });

  //Test1: 代币正确部署测试
  it("Should set the right owner and initial supply", async function (){
      expect(await tokenA.name()).to.equal('TokenA');
      expect(await tokenA.symbol()).to.equal("TKA");
      expect(await tokenA.totalSupply()).to.equal(10000);
      expect(await tokenA.balanceOf(owner.address)).to.equal(10000);

      expect(await tokenB.name()).to.equal('TokenB');
      expect(await tokenB.symbol()).to.equal("TKB");
      expect(await tokenB.totalSupply()).to.equal(10000);
      expect(await tokenB.balanceOf(owner.address)).to.equal(10000);
  });

 //Test2: 代币转账测试 owner->user:1000 tokenA
  it("Should transfer tokens between accounts", async function () {
    const user_initialBalance = await tokenA.balanceOf(user.address);
    console.log('user TokenA余额(初始):',user_initialBalance.toString());
    await tokenA.transfer(user.address, 1000);
    const newBalance = await tokenA.balanceOf(user.address);
    console.log('user TokenA余额(转账后):',newBalance.toString());
    //user tokenA:1000
    expect(newBalance).to.equal(user_initialBalance + ethers.toBigInt(1000));
    const owner_Balance = await tokenA.balanceOf(owner.address);
    //owner tokenA:9000
    expect(owner_Balance).to.equal(ethers.toBigInt(9000));
  });

  //Test3: 转账代币余额不足测试
  it("Should fail if sender doesn't have enough tokens", async function () {
    await expect(tokenA.transfer(user.address, 10000)).to.be.revertedWith("Insufficient balance");
  });

  //Test4: 授权与转账测试
  it("Should approve and transferFrom", async function () {
    await tokenA.connect(owner).approve(user.address, 500); // owner 批准 user 可以花 500
    await expect(tokenA.connect(user).transferFrom(owner.address, user.address, 501)).to.be.revertedWith("Allowance exceeded"); 
    await tokenA.connect(user).transferFrom(owner.address, user.address, 500);
    //user tokenA:8500
    expect(await tokenA.balanceOf(owner.address)).to.equal(8500);
    //owner tokenA:1500
    expect(await tokenA.balanceOf(user.address)).to.equal(1500);
  });

  //Test5: 增加流动性测试
  it("Should allow adding liquidity(First time)", async function () {

    await tokenA.approve(Swap.target, 1000);
    await tokenB.approve(Swap.target, 2000);

    // 添加流动性：1000 TokenA + 2000 TokenB
    await expect(swap.addLiquidity(1000, 2000)).to.emit(swap, "LiquidityAdded").withArgs(owner.address, 1000, 2000, ethers.toBigInt(1414)); 
    
    //检查余额 user tokenA:7500 tokenB:8000
    expect(await tokenA.balanceOf(owner.address)).to.equal(ethers.toBigInt(7500));
    expect(await tokenB.balanceOf(owner.address)).to.equal(ethers.toBigInt(8000));
   
    // 检查总流动性 totalLiquidityTokenA:1000 totalLiquidityTokenB:2000
    expect(await swap.totalLiquidityTokenA()).to.equal(ethers.toBigInt(1000));
    expect(await swap.totalLiquidityTokenB()).to.equal(ethers.toBigInt(2000));
    expect(await swap.totalLPTokens()).to.be.gt(0); // 至少有 LP tokens
   
    // 检查流动性提供者的LPtokens 1414
    expect(await swap.liquidityProvider(owner.address)).to.equal(ethers.toBigInt(1414));

  });


  //Test6: 代币兑换测试 tokenA->tokenB
  it("Should Swap tokenB", async function () {
    await tokenA.connect(user).approve(swap.target, 100);
    const initialBalance_A = await tokenA.balanceOf(user.address);
    const initialBalance_B = await tokenB.balanceOf(user.address);
    console.log("初始 TokenB 余额:", initialBalance_B.toString());
    
    await swap.connect(user).swap(tokenA.target, 100, 9500);

    // 获取兑换后的余额
    const newBalance_A = await tokenA.balanceOf(user.address);
    const newBalance_B = await tokenB.balanceOf(user.address);

    expect(newBalance_A).to.equal(ethers.toBigInt(1400));
    expect(newBalance_B).to.equal(ethers.toBigInt(180));
    console.log("兑换后 TokenA 余额:", newBalance_A.toString());
    console.log("兑换后 TokenB 余额:", newBalance_B.toString());


  });

  //Test7: 0金额兑换
  it("Should reject swapping 0 amount", async function () {
    //await tokenA.connect(user).approve(swap.target, 10);
    await expect(swap.connect(user).swap(tokenA.target, 0, 9500)).to.be.revertedWith("Amount must be positive");
  });
  
  //Test8: 用户添加流动性
  it("Should allow adding liquidity multiple times", async function (){
    await tokenA.connect(user).approve(Swap.target, 50);
    await tokenB.connect(user).approve(Swap.target, 100);
  
    const balanceA = await swap.totalLiquidityTokenA();
    const balanceB = await swap.totalLiquidityTokenB();

    // 添加流动性：50 TokenA + 100 TokenB
    await expect(swap.connect(user).addLiquidity(50, 100)).to.emit(swap, "LiquidityAdded").withArgs(user.address, 50, 82, ethers.toBigInt(64)); // LP tokens 简化为固定值
    
    // 检查总流动性
    expect(await swap.totalLiquidityTokenA()).to.equal(ethers.toBigInt(1150));
    expect(await swap.totalLiquidityTokenB()).to.equal(ethers.toBigInt(1902));
    expect(await swap.totalLPTokens()).to.be.gt(0); // 至少有 LP tokens
    // 检查流动性提供者的LP tokens
    expect(await swap.liquidityProvider(user.address)).to.equal(64);
    expect(await swap.totalLPTokens()).to.equal(1478);
    //用户余额检查
    expect(await TokenA.balanceOf(user.address)).to.equal(1350);
    expect(await TokenB.balanceOf(user.address)).to.equal(98);
  });

  //Test9:移除流动性测试
  it("Should allow removing liquidity", async function () {
    await expect(swap.connect(user).removeLiquidity(32)).to.emit(swap, "LiquidityRemoved").withArgs(user.address, ethers.toBigInt(24), ethers.toBigInt(41), ethers.toBigInt(32));
   
    expect(await swap.totalLiquidityTokenA()).to.equal(ethers.toBigInt(1126));
    expect(await swap.totalLiquidityTokenB()).to.equal(ethers.toBigInt(1861));
    expect(await swap.liquidityProvider(user.address)).to.equal(32);
    expect(await swap.totalLPTokens()).to.equal(1446);

    expect(await TokenA.balanceOf(user.address)).to.equal(ethers.toBigInt(1374));
    expect(await TokenB.balanceOf(user.address)).to.equal(ethers.toBigInt(139));
    
  });
});