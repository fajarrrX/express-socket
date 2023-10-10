module.exports = (socket, spawn) => {
  console.log(socket.id);
  let ffmpeg_processes = [],
    feedStream = false;

  //config_rtmpDestination
  const config_rtmpDestination = (data) => {
    socket._rtmpDestination = data;
    socket.emit("message", "rtmp destination set to: ", data);
    // socket.emit("currentSocketRtmp", data);
  };

  //config_vcodec
  const config_vcodec = (data) => {
    if (typeof data != "string") {
      socket.emit("fatal", "input codec setup error.");
      return;
    }
    if (!/^[0-9a-z]{2,}$/.test(data)) {
      socket.emit("fatal", "input codec contains illegal character?.");
      return;
    } //for safety
    socket._vcodec = data;
  };

  //start
  const start = () => {
    console.log("spawn start");
    console.log("rtmpDestination: ", socket._rtmpDestination);

    var opts = [
      '-hide_banner', 
			'-loglevel', 'error',
      '-i', '-', 
      '-i', 'watermark.png', '-filter_complex', 'overlay=W-w-5:H-h-5',
      '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency', '-b:v', '3000k', '-minrate', '400k', '-bufsize', '6000k', '-g', '60', '-keyint_min', '60', '-threads', '2', '-deadline', 'realtime', 
      '-r', '30', '-c:a', 'aac', '-strict', '-2', '-ar', '48000', '-b:a', '128k',
      '-movflags', 'faststart', 
      '-y',
      '-use_wallclock_as_timestamps', '1', 
      '-async', '1',      
      '-pix_fmt', 'yuv420p', 
      '-f', 'flv'
    ];

    //we dont need this logic, this logic cause error when there is ffmpeg_process or feedStream from another users
    // if (ffmpeg_processes.length > 0 || feedStream) {
    // 	console.log('fatal error: Stream already started.')
    // 	socket.emit('fatal','stream already started.');
    // 	return;
    // }

    if (!socket._rtmpDestination) {
      console.log("fatal error: no destination. Please restart stream");
      socket.emit("fatal", "no destination given.");
      return;
    }

    socket._rtmpDestination.map((destination, index) => {
      let item = spawn("ffmpeg", [...opts, destination]);
      item.socketId = socket.id;
      item.on("uncaughtException", async (error) => {
        console.log("uncaughtException #" + index, error);
        socket.disconnect();
      });
      ffmpeg_processes.push(item);
    });

    feedStream = function (data) {
      // console.log(socket._rtmpDestination.toString())
      ffmpeg_processes.map((ffmpeg, index) => {
        ffmpeg.stdin.write(data);
      });
    };

    ffmpeg_processes.map((ffmpeg, index) => {
      ffmpeg.on("error", function (e) {
        console.log(`child process ${ffmpeg.pid} error` + e);
        socket.emit("error", "ffmpeg error!" + e);
        socket.disconnect();
      });
    });

    ffmpeg_processes.map((ffmpeg, index) => {
      ffmpeg.on("exit", function (e) {
        console.log(`child process ${ffmpeg.pid} exit` + e);
        socket.emit("fatal", "ffmpeg exit!" + e);
        socket.disconnect();
      });
    });

    socket.emit("ready_to_stream", {});
  };

  //binarystream
  const binarystream = (data) => {
    if (!feedStream) {
      socket.emit("fatal", "rtmp not set yet.");
      return;
    }
    feedStream(data);
  };

  //disconnect
  const disconnect = () => {
    if (ffmpeg_processes.length)
      try {
        feedStream = false;
        ffmpeg_processes.map((ffmpeg, index) => {
          console.log("#", index, " ", ffmpeg.socketId, "=====", socket.id);
          console.log(ffmpeg.pid);
          spawn("kill", ["-9", ffmpeg.pid]);
        });
      } catch (error) {
        console.log(error);
        console.log("fatal error: killing ffmpeg process attempt failed");
      }
    console.log("continue");
  };

  //error
  const error = () => {
    console.log("socket.io error:" + e);
    socket.disconnect();
  };

  socket.on("config_rtmpDestination", config_rtmpDestination);
  socket.on("config_vcodec", config_vcodec);
  socket.on("start", start);
  socket.on("binarystream", binarystream);
  socket.on("disconnect", disconnect);
  socket.on("error", error);
};
