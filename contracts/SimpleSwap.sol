// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract SimpleSwap {
    string public name = "SimpleSwap";
    
    // 存储每个用户提供的流动性
    mapping(address => uint256) public liquidityProvider;
    
    // 两种代币的地址
    address public tokenA;
    address public tokenB;
    
    // 池子中两种代币的总量
    uint256 public totalLiquidityTokenA = 0;
    uint256 public totalLiquidityTokenB = 0;
    
    // 流动性代币总量
    uint256 public totalLPTokens = 0;
    
    // 事件定义
    event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB, uint256 lpTokens);
    event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB, uint256 lpTokens);
    event TokensSwapped(address indexed user, address indexed fromToken, address indexed toToken, uint256 amountIn, uint256 amountOut);

    constructor(address _tokenA, address _tokenB) {
        tokenA = _tokenA;
        tokenB = _tokenB;
    }
    
    // 添加流动性
    function addLiquidity(uint256 amountA, uint256 amountB) external {
        require(amountA > 0 && amountB > 0, "Amounts must be positive");
        
        // 计算应该铸造的LP代币数量
        uint256 lpTokens;
        if (totalLPTokens == 0) {
            // 初始流动性提供者设置初始汇率
            lpTokens = calculateLPTokens(amountA, amountB);
        } else {
            // 确保比例匹配现有池子的比例
            uint256 equivalentAmountB = (amountA * totalLiquidityTokenB) / totalLiquidityTokenA;
            uint256 equivalentAmountA = (amountB * totalLiquidityTokenA) / totalLiquidityTokenB;
            
            if (equivalentAmountB < amountB) {
                // 根据实际等值调整amountB
                amountB = equivalentAmountB;
            } else {
                // 根据实际等值调整amountA
                amountA = equivalentAmountA;
            }
            
            // 计算LP代币
            lpTokens = (amountA * totalLPTokens) / totalLiquidityTokenA;
        }
        
        require(lpTokens > 0, "Insufficient liquidity contribution");
        
        // 转账代币
        require(IERC20(tokenA).transferFrom(msg.sender, address(this), amountA), "Token A transfer failed");
        require(IERC20(tokenB).transferFrom(msg.sender, address(this), amountB), "Token B transfer failed");
        
        // 更新全局流动性数据
        totalLiquidityTokenA += amountA;
        totalLiquidityTokenB += amountB;
        totalLPTokens += lpTokens;
        liquidityProvider[msg.sender] += lpTokens;
        
        emit LiquidityAdded(msg.sender, amountA, amountB, lpTokens);
    }
    
    // 移除流动性
    function removeLiquidity(uint256 lpTokens) external {
        require(lpTokens > 0, "Amount must be positive");
        require(liquidityProvider[msg.sender] >= lpTokens, "Not enough LP tokens");
        
        // 计算可以提取的代币数量
        uint256 amountA = (lpTokens * totalLiquidityTokenA) / totalLPTokens;
        uint256 amountB = (lpTokens * totalLiquidityTokenB) / totalLPTokens;
        
        // 更新全局流动性数据
        totalLiquidityTokenA -= amountA;
        totalLiquidityTokenB -= amountB;
        totalLPTokens -= lpTokens;
        liquidityProvider[msg.sender] -= lpTokens;
        
        // 转账代币回给提供者
        require(IERC20(tokenA).transfer(msg.sender, amountA), "Token A withdrawal failed");
        require(IERC20(tokenB).transfer(msg.sender, amountB), "Token B withdrawal failed");
        
        emit LiquidityRemoved(msg.sender, amountA, amountB, lpTokens);
    }
    
    // 代币互换
    function swap(address fromToken, uint256 amountIn) external {
        require((fromToken == tokenA || fromToken == tokenB) && tokenA != tokenB, "Invalid token");
        require(amountIn > 0, "Amount must be positive");
        address toToken = fromToken == tokenA ? tokenB : tokenA;
        
        // 使用恒定乘积公式计算兑换数量
        // x * y = k
        uint256 reserveIn = fromToken == tokenA ? totalLiquidityTokenA : totalLiquidityTokenB;
        uint256 reserveOut = fromToken == tokenA ? totalLiquidityTokenB : totalLiquidityTokenA;
        
        // 先转账输入代币到合约
        require(IERC20(fromToken).transferFrom(msg.sender, address(this), amountIn), "Token deposit failed");
        
        // 计算输出数量，考虑1%的手续费
        uint256 amountInWithFee = amountIn * 99;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 100) + amountInWithFee;
        uint256 amountOut = numerator / denominator;
        
        // 更新储备金数据
        if (fromToken == tokenA) {
            totalLiquidityTokenA += amountIn;
            totalLiquidityTokenB -= amountOut;
        } else {
            totalLiquidityTokenB += amountIn;
            totalLiquidityTokenA -= amountOut;
        }
        
        // 转账输出代币给用户
        require(IERC20(toToken).transfer(msg.sender, amountOut), "Token withdrawal failed");
        
        emit TokensSwapped(msg.sender, fromToken, toToken, amountIn, amountOut);
    }
    
    // 计算LP代币数量（几何平均）
    function calculateLPTokens(uint256 amountA, uint256 amountB) private pure returns (uint256) {
        uint256 sqrtProduct = sqrt(amountA * amountB);
        return sqrtProduct;
    }
    
    // 计算平方根（牛顿迭代法）
    function sqrt(uint256 x) private pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }
}

// ERC20 接口
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}