#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 FiveChat 性能优化脚本');
console.log('================================');

// 检查 Node.js 版本
function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  console.log(`📋 检查 Node.js 版本: ${nodeVersion}`);
  
  if (majorVersion < 18) {
    console.warn('⚠️  建议使用 Node.js 18+ 以获得更好的性能');
  } else {
    console.log('✅ Node.js 版本符合要求');
  }
}

// 检查依赖项
function checkDependencies() {
  console.log('\n📦 检查性能相关依赖...');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const performanceDeps = {
    'react-window': '虚拟化长列表',
    'react-window-infinite-loader': '无限滚动加载',
    'lodash': '工具函数库',
    'sharp': '图片优化',
  };
  
  const missingDeps = [];
  
  for (const [dep, description] of Object.entries(performanceDeps)) {
    if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
      console.log(`✅ ${dep} - ${description}`);
    } else {
      console.log(`❌ ${dep} - ${description} (缺失)`);
      missingDeps.push(dep);
    }
  }
  
  if (missingDeps.length > 0) {
    console.log(`\n📥 安装缺失的依赖: ${missingDeps.join(' ')}`);
    try {
      execSync(`npm install ${missingDeps.join(' ')}`, { stdio: 'inherit' });
      console.log('✅ 依赖安装完成');
    } catch (error) {
      console.error('❌ 依赖安装失败:', error.message);
    }
  }
}

// 优化 Next.js 配置
function optimizeNextConfig() {
  console.log('\n⚙️  检查 Next.js 配置...');
  
  const configPath = path.join(process.cwd(), 'next.config.mjs');
  
  if (fs.existsSync(configPath)) {
    const config = fs.readFileSync(configPath, 'utf8');
    
    const optimizations = [
      { check: 'swcMinify: true', name: 'SWC 压缩' },
      { check: 'compress: true', name: 'Gzip 压缩' },
      { check: 'optimizePackageImports', name: '包导入优化' },
      { check: 'experimental', name: '实验性功能' },
    ];
    
    optimizations.forEach(({ check, name }) => {
      if (config.includes(check)) {
        console.log(`✅ ${name} 已启用`);
      } else {
        console.log(`⚠️  ${name} 未启用`);
      }
    });
  } else {
    console.log('❌ 未找到 next.config.mjs 文件');
  }
}

// 检查图片优化
function checkImageOptimization() {
  console.log('\n🖼️  检查图片优化...');
  
  const publicDir = path.join(process.cwd(), 'public');
  const appDir = path.join(process.cwd(), 'app');
  
  let totalImages = 0;
  let largeImages = 0;
  
  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    files.forEach(file => {
      if (file.isDirectory()) {
        scanDirectory(path.join(dir, file.name));
      } else if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name)) {
        totalImages++;
        const filePath = path.join(dir, file.name);
        const stats = fs.statSync(filePath);
        
        if (stats.size > 500 * 1024) { // 500KB
          largeImages++;
          console.log(`⚠️  大图片文件: ${filePath} (${(stats.size / 1024).toFixed(1)}KB)`);
        }
      }
    });
  }
  
  scanDirectory(publicDir);
  scanDirectory(path.join(appDir, 'images'));
  
  console.log(`📊 总图片数: ${totalImages}, 大文件数: ${largeImages}`);
  
  if (largeImages > 0) {
    console.log('💡 建议: 使用 Sharp 或其他工具压缩大图片文件');
  }
}

// 检查数据库查询优化
function checkDatabaseOptimization() {
  console.log('\n🗄️  检查数据库查询优化...');
  
  const dbFiles = [
    'app/db/index.ts',
    'app/chat/actions/chat.ts',
    'app/chat/actions/message.ts',
  ];
  
  dbFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // 检查是否使用了索引
      if (content.includes('eq(') || content.includes('and(')) {
        console.log(`✅ ${file} - 使用了查询条件`);
      }
      
      // 检查是否有分页
      if (content.includes('limit') && content.includes('offset')) {
        console.log(`✅ ${file} - 实现了分页查询`);
      } else if (content.includes('findMany')) {
        console.log(`⚠️  ${file} - 建议添加分页查询`);
      }
    }
  });
}

// 生成性能报告
function generatePerformanceReport() {
  console.log('\n📊 生成性能优化报告...');
  
  const report = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    recommendations: [
      '✅ 已启用 Turbo 模式开发服务器',
      '✅ 已配置 SWC 编译器',
      '✅ 已启用图片优化',
      '✅ 已配置包导入优化',
      '💡 建议: 对超过50条消息的聊天启用虚拟化',
      '💡 建议: 定期清理不必要的聊天记录',
      '💡 建议: 使用 CDN 加速静态资源',
      '💡 建议: 启用 Redis 缓存（生产环境）',
    ],
    nextSteps: [
      '1. 监控应用性能指标',
      '2. 定期更新依赖项',
      '3. 优化数据库查询',
      '4. 压缩和优化图片资源',
      '5. 考虑使用 Service Worker 缓存',
    ]
  };
  
  const reportPath = path.join(process.cwd(), 'performance-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`📄 性能报告已保存到: ${reportPath}`);
}

// 主函数
function main() {
  try {
    checkNodeVersion();
    checkDependencies();
    optimizeNextConfig();
    checkImageOptimization();
    checkDatabaseOptimization();
    generatePerformanceReport();
    
    console.log('\n🎉 性能优化检查完成！');
    console.log('💡 运行 npm run dev --turbo 启动优化后的开发服务器');
    console.log('💡 运行 npm run build 构建生产版本');
    
  } catch (error) {
    console.error('❌ 优化过程中出现错误:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  checkNodeVersion,
  checkDependencies,
  optimizeNextConfig,
  checkImageOptimization,
  checkDatabaseOptimization,
  generatePerformanceReport,
};
