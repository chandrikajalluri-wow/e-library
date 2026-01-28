/**
 * Verification script for S3 key extraction logic
 */

const testCases = [
    {
        name: "Standard S3 URL",
        url: "https://e-library-pdfs-wowlabz.s3.ap-south-1.amazonaws.com/books/12345-test.pdf",
        expected: "books/12345-test.pdf"
    },
    {
        name: "URL with encoded characters",
        url: "https://e-library-pdfs-wowlabz.s3.ap-south-1.amazonaws.com/books/12345-test%20file.pdf",
        expected: "books/12345-test file.pdf"
    },
    {
        name: "Relative path (if stored that way)",
        url: "/books/12345-test.pdf",
        expected: "books/12345-test.pdf"
    },
    {
        name: "Pure key",
        url: "books/12345-test.pdf",
        expected: "books/12345-test.pdf"
    }
];

function extractKey(pdf_url: string): string {
    let key: string;
    try {
        const urlObject = new URL(pdf_url);
        // This is the logic I added to bookController.ts
        key = decodeURIComponent(urlObject.pathname).replace(/^\/+/, '');
    } catch (urlErr) {
        // Fallback for relative paths or pure keys
        key = pdf_url.replace(/^\/+/, '');
    }
    return key;
}

console.log("=== S3 Key Extraction Logic Verification ===\n");

let passed = 0;
testCases.forEach(tc => {
    const result = extractKey(tc.url);
    const isOk = result === tc.expected;
    console.log(`[${isOk ? "PASS" : "FAIL"}] ${tc.name}`);
    console.log(`   URL:      ${tc.url}`);
    console.log(`   Expected: ${tc.expected}`);
    console.log(`   Result:   ${result}\n`);
    if (isOk) passed++;
});

console.log(`Summary: ${passed}/${testCases.length} tests passed.`);

if (passed === testCases.length) {
    console.log("\nLogic is verified and ROBUST!");
} else {
    console.log("\nLogic failed some tests.");
    process.exit(1);
}
