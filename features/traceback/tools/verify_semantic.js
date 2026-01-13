import SemanticSearch from '../lib/semantic-search.js';

async function runTest() {
    const statusDiv = document.getElementById('status');
    const resultsDiv = document.getElementById('results');

    try {
        // 1. Mock the AI Model
        window.LanguageModel = {
            availability: async () => 'readily',
            create: async () => ({
                prompt: async (text) => {
                    console.log('Mock AI Prompter called with:', text);
                    if (text.includes('Car') || text.includes('car')) {
                        return 'vehicle, automobile, bmw, driving';
                    }
                    return '';
                }
            })
        };

        // 2. Initialize Semantic Search
        const searchEngine = new SemanticSearch();

        // 3. Create a test document that DOES NOT contain the word "Car"
        // But contains "BMW" which the AI should associate with "Car"
        const testCaptures = [{
            id: 1,
            title: "My Morning Commute",
            url: "https://example.com/blog",
            domText: "I drive a black BMW to work every day. It handles well on the highway.",
            timestamp: Date.now()
        }];

        await searchEngine.buildIndex(testCaptures);

        // 4. Perform Search for "Car"
        // Without AI expansion, this would fail (TF-IDF would be 0)
        // With AI expansion to "BMW", it should succeed
        const query = "Car";
        const results = await searchEngine.search(query, testCaptures);

        // 5. Verify Results
        let output = `<h3>Search Query: "${query}"</h3>`;
        output += `<p>Document Text: "${testCaptures[0].domText}"</p>`;

        if (results.length > 0 && results[0].id === 1) {
            output += `<div style="color: green; font-weight: bold;">✅ SUCCESS: Found document!</div>`;
            output += `<p>Match Score: ${results[0].searchScore.toFixed(2)}</p>`;
            output += `<p>Logic Verified: Query "${query}" was expanded to include terms like "BMW", which matched the document.</p>`;
            statusDiv.textContent = 'Verification Passed';
        } else {
            output += `<div style="color: red; font-weight: bold;">❌ FAILED: Did not find document.</div>`;
            if (results.length > 0) {
                output += `<p>Found ${results.length} docs, but top match was ID ${results[0].id}</p>`;
            } else {
                output += `<p>No results found. (Score 0)</p>`;
            }
            statusDiv.textContent = 'Verification Failed';
        }

        resultsDiv.innerHTML = output;

    } catch (error) {
        statusDiv.textContent = 'Error: ' + error.message;
        console.error(error);
    }
}

runTest();
