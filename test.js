const { createPostmanAsserter } = require('./index');

const response = {
    "error": false,
    "statusCode": 200,
    "message": "Customer drawer start fetched successfully.",
    "data": {
        "offerings": {
            "section": "offerings",
            "items": [
                {
                    "id": "passenger",
                    "enabled": true,
                    "title": "Passenger Clan",
                    "imageUrl": "https://monochrome-prod.s3.eu-west-1.wasabisys.com/graphics/image_1778748527297.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=5QTCW79ICMNQVFZT6CNW%2F20260921%2Feu-west-1%2Fs3%2Faws4_request&X-Amz-Date=20260921T130844Z&X-Amz-Expires=604800&X-Amz-Signature=fa5d59de9678b4c76ceb6257fa9d437414182df9b542d193a8d8710fe98ef616&X-Amz-SignedHeaders=host&x-id=GetObject",
                    "action": "passengerBooking"
                },
                {
                    "id": "courier",
                    "enabled": true,
                    "title": "Clans for bike",
                    "imageUrl": "https://monochrome-prod.s3.eu-west-1.wasabisys.com/graphics/image_1778748527580.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=5QTCW79ICMNQVFZT6CNW%2F20260921%2Feu-west-1%2Fs3%2Faws4_request&X-Amz-Date=20260921T130844Z&X-Amz-Expires=604800&X-Amz-Signature=10884b478b3eef2b069a1967cad4ad30416dd4552fcf8be2fbc843214c66d5f4&X-Amz-SignedHeaders=host&x-id=GetObject",
                    "action": "courierBooking"
                },
                {
                    "id": "shuttle",
                    "enabled": true,
                    "title": "Penthouse",
                    "imageUrl": "https://monochrome-prod.s3.eu-west-1.wasabisys.com/graphics/image_1778748527645.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=5QTCW79ICMNQVFZT6CNW%2F20260921%2Feu-west-1%2Fs3%2Faws4_request&X-Amz-Date=20260921T130844Z&X-Amz-Expires=604800&X-Amz-Signature=31dd0dff23a4b47e5fffa9f3fb450df40ed9913b24b42c41f64f8240607ffaf4&X-Amz-SignedHeaders=host&x-id=GetObject",
                    "action": "shuttleBooking"
                },
                {
                    "id": "marketplace",
                    "enabled": true,
                    "title": "Wuse Market",
                    "imageUrl": "https://monochrome-prod.s3.eu-west-1.wasabisys.com/graphics/image_1778748527718.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=5QTCW79ICMNQVFZT6CNW%2F20260921%2Feu-west-1%2Fs3%2Faws4_request&X-Amz-Date=20260921T130844Z&X-Amz-Expires=604800&X-Amz-Signature=124268b8fb83fbed1638c83e2a66837aa079749bd25395b95e49963abce152d5&X-Amz-SignedHeaders=host&x-id=GetObject",
                    "action": "openMarketplace"
                },
                {
                    "id": "vehicleTow",
                    "enabled": true,
                    "title": "broken vehicle",
                    "imageUrl": "https://monochrome-prod.s3.eu-west-1.wasabisys.com/graphics/image_1778933123071.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=5QTCW79ICMNQVFZT6CNW%2F20260921%2Feu-west-1%2Fs3%2Faws4_request&X-Amz-Date=20260921T130844Z&X-Amz-Expires=604800&X-Amz-Signature=9ad42fad0fb5c5b0c009beab7dc43317514f0f2a5b4bef5f088303f03eb172b9&X-Amz-SignedHeaders=host&x-id=GetObject",
                    "action": "towBooking"
                },
                {
                    "id": "dineOut",
                    "enabled": true,
                    "title": "Dinner date",
                    "imageUrl": "https://monochrome-prod.s3.eu-west-1.wasabisys.com/graphics/image_1778933123291.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=5QTCW79ICMNQVFZT6CNW%2F20260921%2Feu-west-1%2Fs3%2Faws4_request&X-Amz-Date=20260921T130844Z&X-Amz-Expires=604800&X-Amz-Signature=71c373f7bcdab33e99fc6f3fbbf7cf8627199d7d2320652fade9dcb98fa3e907&X-Amz-SignedHeaders=host&x-id=GetObject",
                    "action": "dineOutBooking"
                }
            ]
        }
    }
}

// --- Mock the Postman `pm` object ---
const mockPm = {
  request: {
    method: 'GET',
    url: {
      toString: () => 'https://api.example.com/v1/users/appdrawer?limit=10'
    }
  },
  response: {
    code: 200,
    json: () => (
      response
    )
  },
  test: (name, fn) => {
    //try { fn(); console.log(`✅ PM Test Passed: ${name}`); } 
    //catch (e) { console.error(`❌ PM Test Failed: ${name}`); }
    try { fn(); } 
    catch (e) { console.error(`❌ PM Test Failed: ${name}`); }
  },
  expect: (val, msg) => ({
    to: {
      equal: (expected) => {
        if (val !== expected) throw new Error(msg || `Expected ${expected} but got ${val}`);
      }
    }
  })
};

// --- Run the test ---
const { assertFields } = createPostmanAsserter(mockPm);

assertFields(mockPm.response.json(), {
  'statusCode': 'number',
  'message': 'number|string',
  'error': 'boolean',
  'data': 'object',
});