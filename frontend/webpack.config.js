const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");
require("dotenv").config();

module.exports = {
  entry: "./src/index.js", // main entry point
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "bundle.js",
    publicPath: "/",
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,               // Handle JS and JSX files
        exclude: /node_modules/,
        use: "babel-loader",
      },
      {
        test: /\.css$/,                   // Handle CSS files
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg|ico)$/,      // Handle image files
        type: "asset/resource",
        generator: {
          filename: "assets/[name][ext]",
        },
      },
    ],
  },
  resolve: {
    extensions: [".js", ".jsx"],        // Allows importing without specifying file extensions
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./public/index.html",          // HTML template
      filename: "index.html",
      favicon: "./public/favicon.ico",
    }),
    new webpack.DefinePlugin({
      "process.env": JSON.stringify({
        REACT_APP_API_BASE_URL:
          process.env.REACT_APP_API_BASE_URL || "http://localhost:3301",
      }),
    }),
  ],
  devServer: {
    historyApiFallback: true,     // For React Router support
    static: {
      directory: path.join(__dirname, "public"),
    },
    port: 3001,
  },
  mode: "development",
};
