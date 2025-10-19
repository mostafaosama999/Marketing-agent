# Writing Program Finder - Setup & Usage Guide

This guide shows you how to use the Writing Program Finder with the Firebase Functions Emulator (NO cloud deployment needed!).

---

## ✅ Setup Complete!

The following has been configured:

1. **Backend Function** (`/functions/src/writingProgramFinder/findWritingProgram.ts`)
   - Cloud function wrapper around the writing program finder utility
   - Accepts: `website`, `useAiFallback`, `concurrent`, `timeout`
   - Returns: List of writing program URLs found

2. **Frontend Service** (`/frontend/src/services/researchApi.ts`)
   - Added `findWritingProgram` callable function
   - TypeScript types for request/response

---

## 🚀 How to Run Locally (No Deployment!)

### Step 1: Start Firebase Functions Emulator

Open a terminal and run:

```bash
cd functions
npm run serve
```

This will start the emulator at `http://localhost:5001`

You should see output like:
```
✔  functions[us-central1-findWritingProgramCloud]: http function initialized (http://localhost:5001/...)
```

**Keep this terminal running!**

### Step 2: Configure Frontend to Use Emulator

The frontend needs to know to use the local emulator instead of production.

Add this to your Firebase config in `/frontend/src/app/config/firebase.ts`:

```typescript
import { connectFunctionsEmulator } from 'firebase/functions';

// ... existing firebase config ...

// Add this line AFTER initializing functions:
if (process.env.NODE_ENV === 'development') {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

### Step 3: Start Frontend

In a **separate terminal**:

```bash
cd frontend
npm start
```

This will start your React app at `http://localhost:3000`

---

## 💻 How to Use in Your Frontend Code

### Example 1: Basic Usage

```typescript
import { findWritingProgram } from '../services/researchApi';
import type { FindWritingProgramResponse } from '../services/researchApi';

async function handleFindWritingProgram() {
  try {
    const result = await findWritingProgram({
      website: "https://apollo.io",
      useAiFallback: true,
    });

    const data = result.data as FindWritingProgramResponse;

    console.log(`Found ${data.validUrls.length} writing program URLs!`);

    data.validUrls.forEach(url => {
      console.log(url.url);
    });
  } catch (error) {
    console.error("Error:", error);
  }
}
```

### Example 2: In a React Component

```typescript
import React, { useState } from 'react';
import { findWritingProgram, FindWritingProgramResponse } from '../services/researchApi';
import { Button, TextField, CircularProgress } from '@mui/material';

export const WritingProgramFinder: React.FC = () => {
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FindWritingProgramResponse | null>(null);

  const handleFind = async () => {
    setLoading(true);
    try {
      const response = await findWritingProgram({
        website,
        useAiFallback: true,
      });
      setResult(response.data as FindWritingProgramResponse);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to find writing programs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Find Writing Programs</h2>

      <TextField
        label="Website URL"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        placeholder="https://example.com"
        fullWidth
      />

      <Button
        onClick={handleFind}
        disabled={loading || !website}
        variant="contained"
      >
        {loading ? <CircularProgress size={24} /> : 'Find Writing Programs'}
      </Button>

      {result && (
        <div>
          <h3>Results for {result.website}</h3>
          <p>Total URLs checked: {result.totalChecked}</p>
          <p>Valid URLs found: {result.validUrls.length}</p>

          {result.usedAiFallback && (
            <p>🤖 AI Fallback was used</p>
          )}

          <h4>Writing Program URLs:</h4>
          <ul>
            {result.validUrls.map((url, index) => (
              <li key={index}>
                <a href={url.url} target="_blank" rel="noopener noreferrer">
                  {url.url}
                </a>
              </li>
            ))}
          </ul>

          {result.aiSuggestions && result.aiSuggestions.length > 0 && (
            <>
              <h4>AI Suggestions:</h4>
              <ul>
                {result.aiSuggestions.map((suggestion, index) => (
                  <li key={index}>
                    {suggestion.url}
                    ({suggestion.confidence} confidence)
                    {suggestion.verified ? ' ✅' : ' ❌'}
                    <br />
                    <small>{suggestion.reasoning}</small>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
};
```

---

## 🔧 Configuration Options

```typescript
await findWritingProgram({
  website: "https://example.com",     // Required: Website to search
  useAiFallback: true,                // Optional: Use AI if patterns fail (default: true)
  concurrent: 5,                      // Optional: Concurrent URL checks (default: 5)
  timeout: 5000,                      // Optional: Timeout per request in ms (default: 5000)
});
```

---

## 🧪 Testing

### Test the Function Directly (No UI)

You can still test the function via Node.js:

```bash
cd functions
npm run build
node lib/examples/testWritingProgramFinder.js
```

### Test via Emulator

1. Start emulator: `cd functions && npm run serve`
2. Use the frontend to call it
3. Check emulator logs to see what's happening

---

## 🐛 Troubleshooting

### "Authentication error"
If you get authentication errors, either:
- Make sure you're logged in to your app
- Or remove the auth check from the cloud function (line 12-16 in `findWritingProgram.ts`)

### "CORS error"
Make sure:
1. Emulator is running (`npm run serve`)
2. Frontend is configured to use emulator (see Step 2 above)
3. You're running frontend with `npm start` (not production build)

### "Function not found"
Make sure:
1. Functions are built: `cd functions && npm run build`
2. Function is exported in `/functions/src/index.ts`
3. Emulator is restarted after code changes

### "OpenAI API error"
You need to set the OpenAI API key:

```bash
cd functions
firebase functions:config:set openai.api_key="your-api-key"
```

Or for local testing, create `/functions/.runtimeconfig.json`:

```json
{
  "openai": {
    "api_key": "your-openai-api-key-here"
  }
}
```

---

## 📊 Response Structure

```typescript
{
  website: "https://example.com",
  totalChecked: 120,                  // Total URLs pattern-matched
  validUrls: [                        // URLs that exist
    {
      url: "https://example.com/write-for-us",
      exists: true,
      status: 200,
      finalUrl: "https://example.com/write-for-us"
    }
  ],
  patternsFound: ["/write-for-us"],  // URL patterns found
  usedAiFallback: true,               // Whether AI was used
  aiSuggestions: [                    // AI suggestions (if used)
    {
      url: "https://example.com/write-for-us",
      confidence: "high",
      reasoning: "Found in navigation links",
      verified: true
    }
  ],
  aiReasoning: "Website has active community program"
}
```

---

## 🎯 Next Steps

Once you've tested locally and are happy with the results:

1. **Deploy to production:**
   ```bash
   cd functions
   npm run deploy
   ```

2. **Remove emulator config** from frontend (or keep it for development only)

3. **The frontend code stays the same** - it will automatically use production functions when deployed

---

## ✅ Summary

- ✅ Function created: `/functions/src/writingProgramFinder/findWritingProgram.ts`
- ✅ Frontend service added: `findWritingProgram()` in `/frontend/src/services/researchApi.ts`
- ✅ Run locally with emulator (no deployment!)
- ✅ No CORS issues
- ✅ API keys stay secure
- ✅ Works exactly like production

**You can now call this TypeScript function from your frontend - just start the emulator!** 🚀
