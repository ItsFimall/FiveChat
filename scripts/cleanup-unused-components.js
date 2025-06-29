#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { analyzeComponents } = require('./find-unused-components');

console.log('🧹 FiveChat 组件清理工具');
console.log('================================');

// 安全删除文件（移动到备份目录）
function safeDeleteFile(filePath) {
  const backupDir = path.join(process.cwd(), '.backup-components');
  
  // 创建备份目录
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const fileName = path.basename(filePath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `${timestamp}-${fileName}`);
  
  try {
    // 移动文件到备份目录
    fs.renameSync(filePath, backupPath);
    console.log(`  ✅ 已备份到: ${backupPath}`);
    return true;
  } catch (error) {
    console.error(`  ❌ 备份失败: ${error.message}`);
    return false;
  }
}

// 清理注释掉的代码
function cleanupCommentedCode(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 检查是否有被注释的组件引用
    const commentedImports = content.match(/\/\*[\s\S]*?import.*?AdvancedSettingsPopover.*?\*\//g);
    const commentedUsage = content.match(/\/\*[\s\S]*?<AdvancedSettingsPopover[\s\S]*?\*\//g);
    
    if (commentedImports || commentedUsage) {
      // 移除被注释的导入和使用
      let cleanedContent = content;
      
      // 移除被注释的导入
      cleanedContent = cleanedContent.replace(/\/\*[\s\S]*?import.*?AdvancedSettingsPopover.*?\*\//g, '');
      
      // 移除被注释的使用
      cleanedContent = cleanedContent.replace(/\/\*[\s\S]*?<AdvancedSettingsPopover[\s\S]*?\*\//g, '');
      
      // 清理多余的空行
      cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n/g, '\n\n');
      
      fs.writeFileSync(filePath, cleanedContent);
      console.log(`  ✅ 已清理注释代码: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`  ❌ 清理失败: ${error.message}`);
    return false;
  }
}

// 主清理函数
function cleanupUnusedComponents() {
  console.log('🔍 分析组件使用情况...');
  
  const analysis = analyzeComponents();
  const { unusedComponents, suspiciousComponents } = analysis;
  
  console.log('\n📋 清理计划:');
  console.log(`  - 未使用组件: ${unusedComponents.length} 个`);
  console.log(`  - 可疑组件: ${suspiciousComponents.length} 个`);
  
  let deletedCount = 0;
  let cleanedCount = 0;
  
  // 处理完全未使用的组件
  if (unusedComponents.length > 0) {
    console.log('\n🗑️  删除未使用的组件:');
    
    unusedComponents.forEach(component => {
      console.log(`\n处理: ${component.name}`);
      
      // 特殊处理：SignIn 组件可能是早期版本遗留
      if (component.name === 'SignIn') {
        console.log('  📝 SignIn 组件似乎是早期登录实现的遗留代码');
        if (safeDeleteFile(component.fullPath)) {
          deletedCount++;
        }
      }
      // PerformanceMonitor 是新添加的，暂时保留
      else if (component.name === 'PerformanceMonitor') {
        console.log('  ⚠️  PerformanceMonitor 是新添加的性能监控组件，建议保留');
        console.log('  💡 可以在 MessageList 组件中使用它来监控性能');
      }
      else {
        console.log('  ⚠️  跳过删除，建议手动检查');
      }
    });
  }
  
  // 处理可疑组件（被注释的代码）
  if (suspiciousComponents.length > 0) {
    console.log('\n🧹 清理可疑组件:');
    
    suspiciousComponents.forEach(({ component, usages }) => {
      console.log(`\n处理: ${component.name}`);
      
      if (component.name === 'AdvancedSettingsPopover') {
        console.log('  📝 发现被注释的高级设置组件');
        
        // 检查使用该组件的文件
        usages.forEach(usage => {
          console.log(`  🔍 检查文件: ${usage.file}`);
          if (cleanupCommentedCode(path.join(process.cwd(), usage.file))) {
            cleanedCount++;
          }
        });
        
        // 询问是否删除组件文件
        console.log('  ❓ AdvancedSettingsPopover 组件已被注释，建议删除');
        if (safeDeleteFile(component.fullPath)) {
          deletedCount++;
        }
      }
    });
  }
  
  // 生成清理报告
  const cleanupReport = {
    timestamp: new Date().toISOString(),
    summary: {
      deletedComponents: deletedCount,
      cleanedFiles: cleanedCount,
      totalProcessed: deletedCount + cleanedCount
    },
    actions: [
      deletedCount > 0 ? `删除了 ${deletedCount} 个未使用的组件` : null,
      cleanedCount > 0 ? `清理了 ${cleanedCount} 个文件中的注释代码` : null
    ].filter(Boolean),
    recommendations: [
      'PerformanceMonitor 组件建议在开发环境中使用',
      '定期运行组件使用情况检查',
      '删除的组件已备份到 .backup-components 目录'
    ]
  };
  
  const reportPath = path.join(process.cwd(), 'cleanup-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(cleanupReport, null, 2));
  
  console.log('\n📊 清理完成!');
  console.log(`  ✅ 删除组件: ${deletedCount} 个`);
  console.log(`  ✅ 清理文件: ${cleanedCount} 个`);
  console.log(`  📄 详细报告: ${reportPath}`);
  
  if (deletedCount > 0) {
    console.log('\n💡 备份信息:');
    console.log('  - 删除的文件已备份到 .backup-components 目录');
    console.log('  - 如需恢复，可从备份目录复制回来');
  }
  
  return cleanupReport;
}

// 恢复备份的函数
function restoreFromBackup(fileName) {
  const backupDir = path.join(process.cwd(), '.backup-components');
  
  if (!fs.existsSync(backupDir)) {
    console.log('❌ 没有找到备份目录');
    return false;
  }
  
  const backupFiles = fs.readdirSync(backupDir);
  const targetFile = backupFiles.find(file => file.includes(fileName));
  
  if (!targetFile) {
    console.log(`❌ 没有找到 ${fileName} 的备份文件`);
    return false;
  }
  
  const backupPath = path.join(backupDir, targetFile);
  const restorePath = path.join(process.cwd(), 'app', 'components', fileName);
  
  try {
    fs.copyFileSync(backupPath, restorePath);
    console.log(`✅ 已恢复: ${fileName}`);
    return true;
  } catch (error) {
    console.error(`❌ 恢复失败: ${error.message}`);
    return false;
  }
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--restore')) {
    const fileName = args[args.indexOf('--restore') + 1];
    if (fileName) {
      restoreFromBackup(fileName);
    } else {
      console.log('❌ 请指定要恢复的文件名');
      console.log('用法: node cleanup-unused-components.js --restore <filename>');
    }
    return;
  }
  
  if (args.includes('--help')) {
    console.log('用法:');
    console.log('  node cleanup-unused-components.js          # 执行清理');
    console.log('  node cleanup-unused-components.js --restore <filename>  # 恢复文件');
    console.log('  node cleanup-unused-components.js --help   # 显示帮助');
    return;
  }
  
  try {
    cleanupUnusedComponents();
    
    console.log('\n🎉 清理完成！');
    console.log('💡 建议接下来：');
    console.log('  1. 运行 npm run dev 测试应用是否正常');
    console.log('  2. 检查是否有编译错误');
    console.log('  3. 如有问题，使用 --restore 参数恢复文件');
    
  } catch (error) {
    console.error('❌ 清理过程中出现错误:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { cleanupUnusedComponents, restoreFromBackup };
