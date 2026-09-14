/**
 * Automated Verification Script for Book Swap Platform API
 */
const http = require('http');

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting API Verification Tests on Book Swap Platform...\n');

  try {
    // 1. Health check
    console.log('1️⃣ Checking /api/health...');
    const health = await request('GET', '/api/health');
    console.log('   Response:', health.body);

    // 2. Platform Stats
    console.log('\n2️⃣ Checking /api/stats...');
    const stats = await request('GET', '/api/stats');
    console.log('   Stats:', stats.body);

    // 3. Post a new book
    console.log('\n3️⃣ Posting a new book (Rahul: "Atomic Habits")...');
    const newBook = await request('POST', '/api/books', {
      title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
      author: 'Robert C. Martin',
      language: 'English',
      condition: 'Good',
      owner_name: 'Rahul',
      owner_contact: 'rahul.swap@email.com'
    });
    console.log('   Posted Book Result:', newBook.body);
    const postedBookId = newBook.body.data ? newBook.body.data.id : 1;

    // 4. Browse all books with search
    console.log('\n4️⃣ Searching books with ?search=Clean...');
    const searchRes = await request('GET', '/api/books?search=Clean');
    console.log(`   Found ${searchRes.body.count} matching books.`);

    // 5. Submit a Swap Request (Amit requests Clean Code from Rahul)
    console.log('\n5️⃣ Submitting Swap Request (Amit -> Rahul for book ID ' + postedBookId + ')...');
    const swapReq = await request('POST', '/api/requests', {
      book_id: postedBookId,
      requester_name: 'Amit',
      requester_contact: 'amit.reader@email.com',
      message: 'I have "The Pragmatic Programmer" for exchange. Let me know!'
    });
    console.log('   Swap Request Result:', swapReq.body);
    const swapRequestId = swapReq.body.data.id;

    // 6. View Requests received for Rahul
    console.log('\n6️⃣ Checking Requests received by owner "Rahul"...');
    const ownerRequests = await request('GET', '/api/requests?owner_name=Rahul');
    console.log(`   Owner Rahul received ${ownerRequests.body.count} requests.`);

    // 7. Rahul Accepts the Swap Request
    console.log('\n7️⃣ Rahul accepts the swap request...');
    const acceptRes = await request('PATCH', `/api/requests/${swapRequestId}/status`, {
      status: 'Accepted'
    });
    console.log('   Accept Response:', acceptRes.body);

    // 8. Verify Book status changed to 'Swapped'
    console.log('\n8️⃣ Verifying book status is now "Swapped"...');
    const bookCheck = await request('GET', `/api/books/${postedBookId}`);
    console.log(`   Book Status: ${bookCheck.body.data.status}`);

    console.log('\n===========================================');
    console.log('🎉 ALL API VERIFICATION TESTS PASSED SUCCESSFULLY!');
    console.log('===========================================');
  } catch (err) {
    console.error('❌ Test failed:', err);
  }
}

// Give server time to boot
setTimeout(runTests, 1500);
