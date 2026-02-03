const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

class StorageService {
  async uploadReport(buffer, key) {
    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
    };
    const result = await s3.upload(params).promise();
    return result.Location;
  }

  async uploadReportDocx(buffer, key) {
    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    const result = await s3.upload(params).promise();
    return result.Location;
  }
}

module.exports = new StorageService();
