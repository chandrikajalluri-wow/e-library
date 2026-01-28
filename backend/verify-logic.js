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
        name: "Relative path",
        url: "/books/12345-test.pdf",
        expected: "books/12345-test.pdf"
    },
    {
        name: "Pure key",
        url: "books/12345-test.pdf",
        expected: "books/12345-test.pdf"
    }
];

function extractKey(pdf_url) {
    let key;
    try {
        const urlObject = new URL(pdf_url);
        key = decodeURIComponent(urlObject.pathname).replace(/^\/+/, '');
    } catch (urlErr) {
        key = pdf_url.replace(/^\/+/, '');
    }
    return key;
}

console.log("=== S3 Key Extraction Logic Verification ===\n");

testCases.forEach(tc => {
    const result = extractKey(tc.url);
    const isOk = result === tc.expected;
    console.log(`[${isOk ? "PASS" : "FAIL"}] ${tc.name}`);
    console.log(`   URL:      ${tc.url}`);
    console.log(`   Expected: ${tc.expected}`);
    console.log(`   Result:   ${result}\n`);
});
