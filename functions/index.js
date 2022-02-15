const functions = require("firebase-functions");
const axios = require("axios");
// The Firebase Admin SDK to access Firestore.
const admin = require("firebase-admin");
admin.initializeApp({
  serviceAccountId: process.env.NODE_SERVICE_ACCOUNT,
});

const getIdToken = async (user) => {
  console.log("Create the customToken for: ", user.uid);
  const customToken = await admin.auth().createCustomToken(user.uid);
  console.log("The custom Token is: ", customToken);
  const url = `https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyCustomToken?key=${process.env.NODE_APP_FIREBASE_KEY}`;
  const firebaseResponse = await axios.post(url, {
    token: customToken,
    returnSecureToken: true,
  });
  console.log("The custom firebaseResponse is: ", firebaseResponse.data.idToken);
  return firebaseResponse.data.idToken;
};

exports.createUser = functions
  .region("europe-west3")
  .auth.user()
  .onCreate(async (user) => {
    try {
      let idToken;
      if (process.env.NODE_ENV === "production") {
        idToken = await getIdToken(user);
      }

      await axios.post(
        `${process.env.SERVER_API}/user/user-data`,
        {
          id: user.uid,
          email: user.email,
          provider: user.tenantId,
          UserDatum: {
            id: user.uid,
          },
        },
        {
          headers: { Authorization: `Bearer ${idToken}` },
        }
      );
      console.log("Successfully created User ", user.uid);
      return null;
    } catch (error) {
      console.log("An error occured: ", error.message, "Userdata: ", user.uid, ": ", user.email);
      return null;
    }
  });

exports.deleteUser = functions
  .region("europe-west3")
  .auth.user()
  .onDelete(async (user) => {
    try {
      let idToken;
      if (process.env.NODE_ENV === "production") {
        idToken = await getIdToken({ uid: "delete-service-account" });
      }
      await axios.delete(
        `${process.env.SERVER_API}/user/user-data`,
        {
          headers: { Authorization: `Bearer ${idToken}` },
          data: {
            id: user.uid,
          },
        },
      );
      console.log("Successfully deleted User: ", user.uid);
      return null;
    } catch (error) {
      console.log(error.message);
      return null;
    }
  });
