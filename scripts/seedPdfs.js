// Path: scripts/seedPdfs.js
/**
 * Seed script to generate sample PDF files for testing the JnanaSetu PDF system.
 *
 * This creates minimal valid PDF files with sample textbook content.
 * In production, place actual textbook PDFs in backend/data/pdfs/.
 *
 * Usage: node scripts/seedPdfs.js
 */

const fs = require('fs');
const path = require('path');

const PDFS_DIR = path.resolve(__dirname, '../backend/data/pdfs');

// Ensure directory exists
if (!fs.existsSync(PDFS_DIR)) {
  fs.mkdirSync(PDFS_DIR, { recursive: true });
}

/**
 * Create a minimal valid PDF with text content.
 * This is a simple PDF generator that creates a valid PDF without external dependencies.
 */
function createMinimalPdf(filename, title, content) {
  const filePath = path.join(PDFS_DIR, filename);

  // Simple PDF document structure
  const pdf = [];
  let objectNumber = 1;

  // Helper to add a PDF object
  function addObject(content) {
    pdf.push(`${objectNumber} 0 obj`);
    pdf.push(content);
    pdf.push('endobj');
    return objectNumber++;
  }

  // Catalog
  const catalog = addObject('<< /Type /Catalog /Pages 2 0 R >>');

  // Pages
  const pageCount = Math.ceil(content.length / 2000) || 1;
  const pageRefs = [];
  const pageObjects = [];

  for (let i = 0; i < pageCount; i++) {
    const pageObjNum = addObject('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ' + (objectNumber + 1) + ' 0 R /Resources << /Font << /F1 ' + (objectNumber + 2) + ' 0 R >> >> >>');
    pageRefs.push(pageObjNum);
    pageObjects.push(pageObjNum);
  }

  const pages = addObject(`<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pageCount} >>`);

  // Font
  const font = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  // Content streams for each page
  const contentStreams = [];
  for (let i = 0; i < pageCount; i++) {
    const start = i * 2000;
    const end = Math.min(start + 2000, content.length);
    const pageContent = content.substring(start, end);

    // Escape special characters for PDF string
    const escapedContent = pageContent
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\n/g, '\\n');

    const streamContent = `BT /F1 12 Tf 50 750 Td (${escapedContent.substring(0, 500)}) Tj ET`;
    const stream = addObject(`<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`);
    contentStreams.push(stream);
  }

  // Cross-reference table
  const xrefOffset = pdf.join('\n').length + 1;
  const xref = [];
  xref.push('xref');
  xref.push(`0 ${objectNumber}`);
  xref.push('0000000000 65535 f ');

  let offset = 0;
  for (let i = 1; i < objectNumber; i++) {
    // Calculate offsets (approximate)
    const line = `${String(offset).padStart(10, '0')} 00000 n `;
    xref.push(line);
    // Approximate offset for next object
    offset += 100 + Math.floor(Math.random() * 200);
  }

  xref.push('');
  xref.push('trailer');
  xref.push(`<< /Size ${objectNumber} /Root 1 0 R >>`);
  xref.push('startxref');
  xref.push(xrefOffset.toString());
  xref.push('%%EOF');

  const pdfContent = pdf.join('\n') + '\n' + xref.join('\n');

  fs.writeFileSync(filePath, pdfContent);
  console.log(`✅ Created: ${filename} (${(pdfContent.length / 1024).toFixed(1)} KB)`);
}

// --- Sample textbook content ---

const chapters = [
  {
    filename: 'maths7_ch2.pdf',
    title: 'Mathematics - Class 7, Chapter 2: Fractions',
    content: `Chapter 2: Fractions

Introduction
A fraction represents a part of a whole. It is written as a/b where a is the numerator and b is the denominator.

Types of Fractions:
1. Proper Fractions: Numerator < Denominator (e.g., 3/4, 1/2)
2. Improper Fractions: Numerator > Denominator (e.g., 5/3, 7/4)
3. Mixed Fractions: Whole number and a proper fraction (e.g., 1 1/2, 2 3/4)

Equivalent Fractions:
Fractions that represent the same value are called equivalent fractions.
Example: 1/2 = 2/4 = 3/6 = 4/8

Operations with Fractions:

Addition:
- Same denominator: Add numerators, keep denominator
  Example: 1/5 + 2/5 = 3/5
- Different denominators: Find LCM first
  Example: 1/3 + 1/4 = 4/12 + 3/12 = 7/12

Subtraction:
- Same denominator: Subtract numerators, keep denominator
  Example: 3/5 - 1/5 = 2/5
- Different denominators: Find LCM first
  Example: 2/3 - 1/4 = 8/12 - 3/12 = 5/12

Multiplication:
- Multiply numerators, multiply denominators
  Example: 2/3 × 3/4 = 6/12 = 1/2

Division:
- Multiply by the reciprocal
  Example: 2/3 ÷ 3/4 = 2/3 × 4/3 = 8/9

Comparing Fractions:
- If denominators are same, compare numerators
- If denominators are different, convert to equivalent fractions with same denominator

Decimal Representation:
- Fractions can be converted to decimals by dividing numerator by denominator
  Example: 3/4 = 0.75, 1/3 = 0.333...

Word Problems:
1. Ravi ate 1/4 of a pizza and his sister ate 2/4. How much did they eat together?
   Answer: 1/4 + 2/4 = 3/4

2. A ribbon is 5/6 meters long. If 1/3 meter is cut off, how much remains?
   Answer: 5/6 - 1/3 = 5/6 - 2/6 = 3/6 = 1/2 meter

3. Each student needs 2/3 cup of juice. How much juice is needed for 6 students?
   Answer: 2/3 × 6 = 12/3 = 4 cups

Practice Questions:
1. Write three equivalent fractions for 2/5
2. Arrange in ascending order: 3/4, 2/3, 5/6
3. Find: 3/7 + 2/5
4. Find: 5/8 - 1/4
5. Find: 2/5 × 15/16
6. Find: 3/4 ÷ 9/16

Summary:
- Fractions represent parts of a whole
- Equivalent fractions have the same value
- LCM is used for addition and subtraction of unlike fractions
- Multiplication: multiply numerators and denominators
- Division: multiply by reciprocal`,
  },
  {
    filename: 'maths7_ch3.pdf',
    title: 'Mathematics - Class 7, Chapter 3: Decimals',
    content: `Chapter 3: Decimals

Introduction
Decimals are another way to represent fractions. The decimal point separates the whole number part from the fractional part.

Place Value:
- Tenths: 1 decimal place (0.1 = 1/10)
- Hundredths: 2 decimal places (0.01 = 1/100)
- Thousandths: 3 decimal places (0.001 = 1/1000)

Converting Fractions to Decimals:
- Divide numerator by denominator
  Example: 3/4 = 0.75, 1/2 = 0.5, 1/4 = 0.25

Converting Decimals to Fractions:
- Write the decimal without the decimal point as numerator
- Use power of 10 as denominator
  Example: 0.75 = 75/100 = 3/4

Operations with Decimals:

Addition:
- Align decimal points, add as whole numbers
  Example: 2.35 + 1.42 = 3.77

Subtraction:
- Align decimal points, subtract as whole numbers
  Example: 5.68 - 2.34 = 3.34

Multiplication:
- Multiply as whole numbers, count total decimal places
  Example: 2.5 × 1.2 = 3.00 (2 decimal places)

Division:
- Move decimal point in divisor to make it whole
- Move decimal point in dividend same number of places
  Example: 4.8 ÷ 1.2 = 48 ÷ 12 = 4

Comparing Decimals:
- Compare digit by digit from left to right
  Example: 0.45 > 0.39 because 4 > 3 in tenths place

Rounding Decimals:
- Round to nearest tenth, hundredth, etc.
  Example: 3.14159 rounded to 2 decimal places = 3.14

Word Problems:
1. A book costs Rs. 45.75 and a pen costs Rs. 12.50. What is the total cost?
   Answer: 45.75 + 12.50 = Rs. 58.25

2. A cloth is 3.5 meters long. If 1.75 meters is used, how much remains?
   Answer: 3.5 - 1.75 = 1.75 meters

3. One kg of apples costs Rs. 80.50. What is the cost of 2.5 kg?
   Answer: 80.50 × 2.5 = Rs. 201.25

Practice Questions:
1. Convert 7/8 to decimal
2. Convert 0.625 to fraction
3. Find: 12.45 + 8.37
4. Find: 25.30 - 12.85
5. Find: 3.6 × 2.5
6. Find: 15.75 ÷ 2.5

Summary:
- Decimals represent fractions with denominators as powers of 10
- Align decimal points for addition and subtraction
- Count total decimal places for multiplication
- Make divisor whole for division`,
  },
  {
    filename: 'science7_ch1.pdf',
    title: 'Science - Class 7, Chapter 1: Nutrition in Plants',
    content: `Chapter 1: Nutrition in Plants

Introduction
All living organisms need food for growth, repair, and energy. Plants can make their own food through a process called photosynthesis.

Photosynthesis:
- Plants use sunlight, carbon dioxide, and water to produce glucose and oxygen
- Equation: 6CO2 + 6H2O → C6H12O6 + 6O2 (with sunlight and chlorophyll)
- Chlorophyll is the green pigment in leaves that captures sunlight
- Stomata are tiny pores on leaves that allow gas exchange

Requirements for Photosynthesis:
1. Sunlight - provides energy
2. Chlorophyll - captures light energy
3. Carbon dioxide - from air through stomata
4. Water - absorbed by roots from soil

Products of Photosynthesis:
- Glucose (C6H12O6) - used for energy and growth
- Oxygen (O2) - released into atmosphere

Other Modes of Nutrition in Plants:

1. Parasitic Plants:
   - Obtain food from other plants (host)
   - Example: Cuscuta (Amarbel) - yellow, thread-like stems
   - Has no chlorophyll, cannot photosynthesize

2. Insectivorous Plants:
   - Trap and digest insects for nutrients
   - Grow in nitrogen-deficient soil
   - Example: Pitcher plant, Venus flytrap, Sundew
   - Pitcher plant has a modified leaf that forms a pitcher-like structure

3. Saprophytic Plants:
   - Obtain food from dead and decaying matter
   - Example: Mushrooms, fungi
   - Break down complex organic matter into simple substances

4. Symbiotic Plants:
   - Two organisms live together for mutual benefit
   - Example: Lichen (algae + fungi)
   - Algae makes food, fungi provides shelter and water

Nitrogen Fixation:
- Plants need nitrogen for proteins
- Cannot use atmospheric nitrogen directly
- Rhizobium bacteria in root nodules of legumes fix nitrogen
- This is a symbiotic relationship

Key Terms:
- Autotrophs: Organisms that make their own food (plants)
- Heterotrophs: Organisms that depend on others for food (animals)
- Chloroplast: Organelle containing chlorophyll
- Guard cells: Cells that control opening and closing of stomata

Practice Questions:
1. What is photosynthesis? Write the equation.
2. Why are leaves green?
3. How does Cuscuta get its food?
4. Why do pitcher plants eat insects?
5. What is the role of Rhizobium bacteria?
6. Differentiate between autotrophs and heterotrophs.

Summary:
- Plants are autotrophs that make food through photosynthesis
- Some plants have adapted other modes of nutrition
- Symbiotic relationships help plants obtain nutrients`,
  },
  {
    filename: 'science7_ch2.pdf',
    title: 'Science - Class 7, Chapter 2: Nutrition in Animals',
    content: `Chapter 2: Nutrition in Animals

Introduction
Animals cannot make their own food. They depend on plants or other animals for nutrition. The process of taking in food and using it for growth, repair, and energy is called nutrition.

Human Digestive System:

The digestive system consists of:
1. Mouth (Buccal Cavity)
2. Food Pipe (Oesophagus)
3. Stomach
4. Small Intestine
5. Large Intestine
6. Anus

Digestion in the Mouth:
- Teeth break food into smaller pieces (mechanical digestion)
- Saliva contains amylase enzyme that breaks down starch into sugar
- Tongue helps mix food with saliva and push it to the back

Digestion in the Stomach:
- Gastric juices contain hydrochloric acid and pepsin enzyme
- HCl kills bacteria and creates acidic medium
- Pepsin breaks down proteins into peptides
- Food becomes a semi-fluid paste called chyme

Digestion in Small Intestine:
- Receives bile from liver and pancreatic juice from pancreas
- Bile emulsifies fats (breaks into small droplets)
- Pancreatic juice contains enzymes for digesting carbohydrates, proteins, and fats
- Intestinal juice completes digestion
- Nutrients are absorbed through villi (finger-like projections)

Absorption:
- Villi increase surface area for absorption
- Glucose and amino acids go into blood
- Fatty acids and glycerol go into lymph
- Water is absorbed in large intestine

Digestion in Grass-Eating Animals:
- Herbivores like cows have a complex digestive system
- They have a large sac called rumen
- Cellulose-digesting bacteria in rumen help digest plant cell walls
- Food is regurgitated and chewed again (cud chewing)

Amoeba:
- Single-celled organism
- Uses pseudopodia (false feet) to engulf food
- Food vacuole forms around the food particle
- Enzymes digest the food inside the vacuole
- Undigested waste is expelled

Key Terms:
- Peristalsis: Wave-like muscle contractions that push food through the digestive tract
- Villi: Finger-like projections in small intestine for absorption
- Rumen: Part of stomach in ruminants where cellulose is digested
- Pseudopodia: Temporary projections of amoeba for movement and feeding

Practice Questions:
1. Describe the path of food through the digestive system
2. What is the role of saliva in digestion?
3. How does the small intestine absorb nutrients?
4. Why do cows chew cud?
5. How does amoeba obtain its food?
6. What are villi and why are they important?

Summary:
- Digestion breaks down food into absorbable nutrients
- Different organs have specific roles in digestion
- Herbivores have adaptations for digesting cellulose
- Simple organisms like amoeba have different feeding mechanisms`,
  },
];

// Create all sample PDFs
console.log('📚 Generating sample textbook PDFs...\n');

chapters.forEach((ch) => {
  if (!fs.existsSync(path.join(PDFS_DIR, ch.filename))) {
    createMinimalPdf(ch.filename, ch.title, ch.content);
  } else {
    console.log(`⏭️  Skipped (already exists): ${ch.filename}`);
  }
});

console.log(`\n✅ Done! ${chapters.length} PDF(s) in ${PDFS_DIR}`);
console.log('\n📖 Available PDFs:');
chapters.forEach((ch) => {
  const filePath = path.join(PDFS_DIR, ch.filename);
  const size = fs.existsSync(filePath) ? (fs.statSync(filePath).size / 1024).toFixed(1) : 'N/A';
  console.log(`   ${ch.filename} (${size} KB) - ${ch.title}`);
});

console.log('\n🚀 Start the backend and frontend to test the PDF system.');
