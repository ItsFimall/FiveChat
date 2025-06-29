#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 FiveChat 未使用组件检查');
console.log('================================');

// 获取所有组件文件
function getAllComponents(dir) {
  const components = [];
  
  function scanDirectory(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    
    const files = fs.readdirSync(currentDir, { withFileTypes: true });
    
    files.forEach(file => {
      if (file.isDirectory()) {
        scanDirectory(path.join(currentDir, file.name));
      } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
        const filePath = path.join(currentDir, file.name);
        const relativePath = path.relative(process.cwd(), filePath);
        
        // 提取组件名（文件名去掉扩展名）
        const componentName = path.basename(file.name, path.extname(file.name));
        
        components.push({
          name: componentName,
          path: relativePath,
          fullPath: filePath
        });
      }
    });
  }
  
  scanDirectory(dir);
  return components;
}

// 搜索组件使用情况
function findComponentUsage(componentName, searchDirs) {
  const usages = [];
  
  function searchInDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    files.forEach(file => {
      if (file.isDirectory() && !file.name.includes('node_modules') && !file.name.includes('.next')) {
        searchInDirectory(path.join(dir, file.name));
      } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts') || file.name.endsWith('.js') || file.name.endsWith('.jsx')) {
        const filePath = path.join(dir, file.name);
        
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // 检查各种导入和使用模式
          const patterns = [
            new RegExp(`import.*${componentName}.*from`, 'g'),
            new RegExp(`import.*{.*${componentName}.*}.*from`, 'g'),
            new RegExp(`<${componentName}[\\s>]`, 'g'),
            new RegExp(`<${componentName}\\/>`, 'g'),
            new RegExp(`${componentName}\\(`, 'g'), // 函数调用
            new RegExp(`export.*${componentName}`, 'g'), // 导出
          ];
          
          patterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
              usages.push({
                file: path.relative(process.cwd(), filePath),
                matches: matches.length,
                patterns: matches
              });
            }
          });
        } catch (error) {
          // 忽略读取错误
        }
      }
    });
  }
  
  searchDirs.forEach(dir => searchInDirectory(dir));
  return usages;
}

// 检查特殊情况（动态导入、字符串引用等）
function checkSpecialUsages(componentName, searchDirs) {
  const specialUsages = [];
  
  function searchSpecial(dir) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    files.forEach(file => {
      if (file.isDirectory() && !file.name.includes('node_modules') && !file.name.includes('.next')) {
        searchSpecial(path.join(dir, file.name));
      } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts') || file.name.endsWith('.js') || file.name.endsWith('.jsx')) {
        const filePath = path.join(dir, file.name);
        
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // 检查动态导入
          const dynamicImportPattern = new RegExp(`lazy\\(.*${componentName}|import\\(.*${componentName}`, 'g');
          const stringReferencePattern = new RegExp(`['"\`].*${componentName}.*['"\`]`, 'g');
          
          if (dynamicImportPattern.test(content) || stringReferencePattern.test(content)) {
            specialUsages.push({
              file: path.relative(process.cwd(), filePath),
              type: 'dynamic/string reference'
            });
          }
        } catch (error) {
          // 忽略读取错误
        }
      }
    });
  }
  
  searchDirs.forEach(dir => searchSpecial(dir));
  return specialUsages;
}

// 主分析函数
function analyzeComponents() {
  const componentsDir = path.join(process.cwd(), 'app', 'components');
  const searchDirs = [
    path.join(process.cwd(), 'app'),
    path.join(process.cwd(), 'pages'), // 如果有 pages 目录
  ];
  
  console.log('📂 扫描组件目录...');
  const components = getAllComponents(componentsDir);
  console.log(`发现 ${components.length} 个组件文件\n`);
  
  const unusedComponents = [];
  const usedComponents = [];
  const suspiciousComponents = [];
  
  components.forEach(component => {
    console.log(`🔍 检查组件: ${component.name}`);
    
    const usages = findComponentUsage(component.name, searchDirs);
    const specialUsages = checkSpecialUsages(component.name, searchDirs);
    
    // 过滤掉自身文件的引用
    const externalUsages = usages.filter(usage => 
      !usage.file.includes(component.path) && 
      !usage.file.includes(component.name)
    );
    
    if (externalUsages.length === 0 && specialUsages.length === 0) {
      unusedComponents.push(component);
      console.log(`  ❌ 未使用`);
    } else if (externalUsages.length <= 1 && specialUsages.length === 0) {
      suspiciousComponents.push({
        component,
        usages: externalUsages,
        specialUsages
      });
      console.log(`  ⚠️  使用次数较少 (${externalUsages.length} 次)`);
    } else {
      usedComponents.push({
        component,
        usages: externalUsages,
        specialUsages
      });
      console.log(`  ✅ 正常使用 (${externalUsages.length + specialUsages.length} 次)`);
    }
  });
  
  return { unusedComponents, usedComponents, suspiciousComponents };
}

// 生成报告
function generateReport(analysis) {
  const { unusedComponents, usedComponents, suspiciousComponents } = analysis;
  
  console.log('\n📊 分析结果');
  console.log('================================');
  
  console.log(`\n❌ 未使用的组件 (${unusedComponents.length} 个):`);
  if (unusedComponents.length === 0) {
    console.log('  🎉 没有发现未使用的组件！');
  } else {
    unusedComponents.forEach(component => {
      console.log(`  - ${component.name} (${component.path})`);
    });
  }
  
  console.log(`\n⚠️  使用次数较少的组件 (${suspiciousComponents.length} 个):`);
  if (suspiciousComponents.length === 0) {
    console.log('  ✅ 所有组件都有充分使用');
  } else {
    suspiciousComponents.forEach(({ component, usages }) => {
      console.log(`  - ${component.name} (${component.path})`);
      usages.forEach(usage => {
        console.log(`    └─ 使用于: ${usage.file}`);
      });
    });
  }
  
  console.log(`\n✅ 正常使用的组件: ${usedComponents.length} 个`);
  
  // 生成详细报告文件
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: unusedComponents.length + usedComponents.length + suspiciousComponents.length,
      unused: unusedComponents.length,
      suspicious: suspiciousComponents.length,
      used: usedComponents.length
    },
    unusedComponents: unusedComponents.map(c => ({
      name: c.name,
      path: c.path
    })),
    suspiciousComponents: suspiciousComponents.map(({ component, usages }) => ({
      name: component.name,
      path: component.path,
      usageCount: usages.length,
      usedIn: usages.map(u => u.file)
    })),
    recommendations: []
  };
  
  // 添加建议
  if (unusedComponents.length > 0) {
    report.recommendations.push('考虑删除未使用的组件以减少代码库大小');
  }
  
  if (suspiciousComponents.length > 0) {
    report.recommendations.push('检查使用次数较少的组件是否可以合并或重构');
  }
  
  const reportPath = path.join(process.cwd(), 'unused-components-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 详细报告已保存到: ${reportPath}`);
  
  return report;
}

// 主函数
function main() {
  try {
    const analysis = analyzeComponents();
    const report = generateReport(analysis);
    
    console.log('\n💡 建议:');
    if (report.unusedComponents.length > 0) {
      console.log('  1. 删除未使用的组件文件');
      console.log('  2. 检查是否有遗漏的引用');
    }
    if (report.suspiciousComponents.length > 0) {
      console.log('  3. 考虑重构使用次数较少的组件');
    }
    console.log('  4. 定期运行此脚本检查代码清洁度');
    
  } catch (error) {
    console.error('❌ 分析过程中出现错误:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { analyzeComponents, generateReport };
