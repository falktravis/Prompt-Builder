import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
    sassOptions: {
        includePaths: [path.join(__dirname, 'src/styles')], // Corrected to 'src/styles'
        prependData: `
        @use "variables/colors" as colors; // Corrected path
        @use "variables/mixins" as mixins; // Corrected path
        @use "variables/typography" as typography; // Corrected path
        @use "global/reset"; // Corrected path
        @use "global/base"; // Corrected path
        `
    },
    // This is required to support PostHog trailing slash API requests
    skipTrailingSlashRedirect: true,
    trailingSlash: true, // Add this line
};

export default nextConfig;
