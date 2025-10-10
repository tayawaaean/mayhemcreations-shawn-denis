const fs = require('fs');
const path = require('path');

function disableIndexesInModels() {
  console.log('🔧 Temporarily disabling indexes in model files...');
  
  const modelsDir = path.join(__dirname, 'src', 'models');
  const modelFiles = fs.readdirSync(modelsDir).filter(file => file.endsWith('.ts') && file !== 'index.ts');
  
  modelFiles.forEach(file => {
    const filePath = path.join(modelsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if the file has indexes defined
    if (content.includes('indexes: [')) {
      console.log(`   📝 Processing ${file}...`);
      
      // Replace indexes array with empty array
      content = content.replace(
        /indexes:\s*\[[\s\S]*?\],/g,
        'indexes: [], // Temporarily disabled to fix "too many keys" error'
      );
      
      // Also remove unique constraints that create indexes
      content = content.replace(
        /unique:\s*true,/g,
        'unique: false, // Temporarily disabled'
      );
      
      fs.writeFileSync(filePath, content);
      console.log(`   ✅ Disabled indexes in ${file}`);
    }
  });
  
  console.log('🎉 All model indexes temporarily disabled!');
  console.log('💡 You can now start the server and then re-enable indexes manually.');
}

disableIndexesInModels();
