const PROTO_PATH = __dirname + '/../protos/auth.proto';
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
// Suggested options for similarity to existing grpc.load behavior
const packageDefinition = protoLoader.loadSync(
  PROTO_PATH,
  {keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
// The protoDescriptor object has the full package hierarchy
const auth = protoDescriptor.authservice;

async function getUserInfo(token) {
  const client = new auth.AuthService(process.env.AUTH_URL, grpc.credentials.createInsecure());
  return new Promise((resolve, reject) => {
    client.userInfo({auth_token: token}, function(err, response) {
      if (err) {
        reject(err);
      } else {
        resolve(response);
      }
    });
  });
}

export default getUserInfo
