# Use Node.js 18 Alpine as the base image
FROM node:18-alpine

# Install FFmpeg and other necessary dependencies
RUN apk add --no-cache ffmpeg

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Bundle app source
COPY . .

# Make port 3000 available to the world outside this container
EXPOSE 4000

# Run the app when the container launches
CMD ["node", "index.js"]