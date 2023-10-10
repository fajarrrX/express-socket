module.exports = (socket, tiktokConnection, axios) => {
  // Username of someone who is currently live
  let uniqueId = null;
  let partner_stream_id = null;

  const tiktokUsername = (data) => {
    try {
      uniqueId = data.username;
      partner_stream_id = data.partner_stream_id;

      // Create a new wrapper object and pass the username
      let tiktokLiveConnection = new tiktokConnection(uniqueId);

      // Connect to the chat (await can be used as well)
      tiktokLiveConnection
        .connect()
        .then((state) => {
          console.info(`Connected to roomId ${state.roomId}`);
        })
        .catch((err) => {
          console.error("Failed to connect", err);
        });

      // Define the events that you want to handle
      // In this case we listen to chat messages (comments)
      tiktokLiveConnection.on("chat", (data) => {
        let postComment = {
          data: data,
          partner_stream_id: partner_stream_id,
        };

        // post comment to API liveambassador
        // https://sandbox.liveambassador.com/api/v1/nodejs/comment
        // https://liveambassador.com/api/v1/nodejs/comment
        axios
          .post(
            "https://sandbox.liveambassador.com/api/v1/nodejs/comment",
            postComment,
            {
              headers: {
                Authorization: "Bearer Ambassador",
              },
            }
          )
          .then((res) => {
            // console.log(res.data);
          })
          .catch((error) => {
            console.error(error);
          });
      });
    } catch (error) {
      console.log("socket.io error:" + error);
      socket.disconnect();
    }
  };

  // socket.io events
  socket.on("tiktokUsername", tiktokUsername);
};
