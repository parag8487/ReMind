
/**
 * Standalone Test for Semantic Search Logic
 * veries: 
 * 1. 384-dimensional vector handling
 * 2. Cosine similarity math
 * 3. Threshold filtering (0.2)
 * 4. Ranking logic
 */

// --- 1. MOCK IMPLEMENTATION (Copy of logic from semantic-search.js) ---

class SemanticSearch {
    cosineSimilarity(vecA, vecB) {
        if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dot += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        if (normA === 0 || normB === 0) return 0;
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    async search(query, captures, queryVector) {
        const results = [];
        console.log(`\n🔎 Searching for "${query}"...`);

        for (const capture of captures) {
            let score = 0;
            let vectorScore = 0;

            // Semantic Vector Score
            if (queryVector && capture.embedding) {
                vectorScore = this.cosineSimilarity(queryVector, capture.embedding);

                // LOGGING FOR DEMONSTRATION
                console.log(`   Comparing with "${capture.title}": Similarity = ${vectorScore.toFixed(4)}`);

                if (vectorScore > 0.2) { // The threshold we set
                    score += vectorScore * 200;
                    console.log(`   ✅ Match! (Score Boosted by ${vectorScore * 200})`);
                } else {
                    console.log(`   ❌ No Match (Below 0.2 threshold)`);
                }
            }

            if (score > 15) {
                results.push({ ...capture, searchScore: score });
            }
        }

        return results.sort((a, b) => b.searchScore - a.searchScore);
    }
}

// --- 2. VECTOR GENERATOR HELPER ---

// Creates a normalized random vector of size 384
function createVector(size = 384) {
    const vec = new Array(size).fill(0).map(() => Math.random() - 0.5);
    // Normalize
    const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    return vec.map(val => val / norm);
}

// Create a vector similar to 'target' (mix 80% target + 20% noise)
function createSimilarVector(target) {
    const noise = createVector(target.length);
    const result = target.map((val, i) => val * 0.8 + noise[i] * 0.2);
    // Re-normalize magnitude
    const norm = Math.sqrt(result.reduce((sum, val) => sum + val * val, 0));
    return result.map(val => val / norm);
}

// --- 3. TEST EXECUTION ---

async function runTest() {
    console.log("🧪 STARTING SEMANTIC SEARCH VERIFICATION");
    console.log("-----------------------------------------");

    const searchEngine = new SemanticSearch();

    // A. Generate "Concept" Vectors (simulating AI output)
    console.log("1. Generating 384-dimensional test vectors...");

    const lionVector = createVector(384);   // "Lion"
    const techVector = createVector(384);   // "Computer" (Randomly different from Lion)

    // "Animal" query should be close to "Lion"
    const animalQueryVector = createSimilarVector(lionVector);

    console.log(`   - Lion Vector Length: ${lionVector.length}`);
    console.log(`   - Tech Vector Length: ${techVector.length}`);
    console.log("   ✅ Vectors generated successfully.\n");

    // B. Mock Database
    const captures = [
        {
            id: 1,
            title: "Article about Lions",
            embedding: lionVector,
            timestamp: Date.now()
        },
        {
            id: 2,
            title: "Review of RTX 4090",
            embedding: techVector,
            timestamp: Date.now()
        }
    ];

    // C. Perform Search: Query "Animal"
    // We expect it to match "Lions" (id:1) but NOT "RTX 4090" (id:2)
    const results = await searchEngine.search("Animal", captures, animalQueryVector);

    // D. Validate Results
    console.log("\n📊 RESULTS:");
    if (results.length > 0 && results[0].id === 1) {
        console.log("   ✅ SUCCESS: 'Lion' article ranked #1 for 'Animal' query.");
        console.log(`   - Top Score: ${results[0].searchScore.toFixed(2)}`);
    } else {
        console.log("   ❌ FAILURE: Top result was not 'Lion'.");
    }

    if (results.find(r => r.id === 2)) {
        // It might be found if random noise made it slightly similar, but mostly unlikely to pass >15 threshold
        console.log("   ⚠️ Note: Tech article also appeared (low similarity).");
    } else {
        console.log("   ✅ SUCCESS: 'Tech' article correctly filtered out.");
    }
}

runTest();

