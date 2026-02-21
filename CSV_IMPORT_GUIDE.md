# Question Import CSV Guide

## CSV Format

The CSV file for importing questions must have the following columns in this exact order:

**For Grade 9-11 Courses (4 options):**
```
question_text,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation
```

**For Grade 12-13 Courses (5 options):**
```
question_text,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation
```

### Column Descriptions

- **question_text** (Required): The question text
- **option_a** (Required): First option (A)
- **option_b** (Required): Second option (B)
- **option_c** (Required): Third option (C)
- **option_d** (Required): Fourth option (D)
- **option_e** (Required for Grade 12-13, leave empty for Grade 9-11): Fifth option (E)
- **correct_answer** (Required): 
  - Grade 9-11: Must be exactly 'A', 'B', 'C', or 'D'
  - Grade 12-13: Must be exactly 'A', 'B', 'C', 'D', or 'E'
- **explanation** (Optional): Explanation for the correct answer

### Example CSV

**For Grade 9-11 Courses (4 options):**
```csv
question_text,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation
What is the capital of France?,London,Paris,Berlin,Madrid,,B,Paris is the capital and largest city of France.
Which planet is known as the Red Planet?,Venus,Mars,Jupiter,Saturn,,B,Mars is called the Red Planet because of its reddish appearance.
What is 2 + 2?,3,4,5,6,,B,Basic arithmetic: 2 plus 2 equals 4.
```

**For Grade 12-13 Courses (5 options):**
```csv
question_text,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation
"What is the derivative of x^2?",x,2x,x^2,2,0,B,"The derivative of x^2 is 2x, using the power rule."
```

### Important Notes

1. **Option Count Based on Grade**: 
   - Grades 9-11 require exactly 4 options (A, B, C, D). Leave option_e empty.
   - Grades 12-13 require exactly 5 options (A, B, C, D, E). Fill all options.

2. **No Images in CSV**: Images cannot be imported via CSV. After importing, you can edit each question to add images.

3. **Character Encoding**: Save your CSV file with UTF-8 encoding to support special characters.

4. **Commas in Text**: If your question or options contain commas, wrap the text in double quotes:
   ```csv
   "What is 10,000 + 5,000?","5,000","10,000","15,000","20,000",,C,Addition of large numbers
   ```

5. **Quotes in Text**: If your text contains quotes, escape them with double quotes:
   ```csv
   "What does ""AI"" stand for?",Artificial Intelligence,Automated Integration,Advanced Interface,Actual Information,,A,AI stands for Artificial Intelligence
   ```

6. **Validation**: Each row will be validated during import. Errors will be reported but won't stop the import process.

## Download Template

Visit the Questions page and click "Download Template" in the Import CSV modal to get a properly formatted template file.

## After Import

After importing questions via CSV:

1. Review all imported questions
2. Edit questions to add images if needed
3. Add images to question text
4. Add images to individual options
5. Update explanations with more detail

## Limitations

- Grade 9-11: 4 options per question (A, B, C, D)
- Grade 12-13: 5 options per question (A, B, C, D, E)
- Only one correct answer per question
- Images must be added manually after import
- Questions are appended to existing questions (not replaced)
