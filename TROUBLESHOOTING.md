# Troubleshooting UploadThing Image Upload

## Issue: Upload stuck in "Uploading..." state

The upload appears to complete successfully on UploadThing's side, but the UI remains in the uploading state with a spinning icon.

## Root Cause Analysis

The issue is likely one of these common problems:

### 1. Missing Environment Variables
Ensure these variables are set in your `.env.local`:

```bash
UPLOADTHING_SECRET=your_secret_key_here
UPLOADTHING_APP_ID=your_app_id_here
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key_here
CLERK_SECRET_KEY=your_clerk_secret_here
```

### 2. UploadThing Configuration Issue
Check the UploadThing dashboard to ensure:
- Your app is properly configured
- The secret key is correct and active
- File upload permissions are set correctly

### 3. Console Errors
Open browser DevTools and check for:
- Network errors in the Network tab
- JavaScript errors in the Console tab
- Look for specific UploadThing related errors

## Debugging Steps

1. **Check Console Output**
   The updated code now includes detailed logging. Look for:
   ```
   Starting upload for question: X files: [...]
   Upload began for question: X
   Upload completed: [...] for question: X
   ```

2. **Verify File Upload**
   - Check that files actually appear in your UploadThing dashboard
   - Note the file URL structure

3. **Test Environment Variables**
   Add this temporary debug component to verify UploadThing is configured:
   ```typescript
   console.log({
     hasSecret: !!process.env.UPLOADTHING_SECRET,
     hasAppId: !!process.env.UPLOADTHING_APP_ID,
   })
   ```

4. **Check Network Requests**
   - Look for requests to `uploadthing.com` in Network tab
   - Verify they return 200 status codes
   - Check response payloads

## Quick Fix

If the issue persists, try this manual reset:
1. Refresh the page
2. Try uploading a single, small image (< 1MB)
3. Check if the issue occurs with specific file types

## Alternative Approach

If the callback issue persists, you can implement a polling mechanism:
1. Store the upload start time
2. Poll UploadThing API to check upload status
3. Update UI when upload is confirmed complete

The current implementation includes a 30-second timeout fallback to prevent permanent stuck states.

## Contact Support

If the issue continues:
1. Check UploadThing status page
2. Verify your UploadThing account is active
3. Contact UploadThing support with specific error messages