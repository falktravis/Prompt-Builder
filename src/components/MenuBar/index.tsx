/**
 * MenuBar component
 * Provides a vertical bar with icon buttons for various actions.
 */
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image'; // Import next/image
import './MenuBar.scss';

import SettingsIcon from "@mui/icons-material/Settings";
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';

interface MenuBarProps {
  openSettings: () => void;
  openCommunityLibrary: () => void;
}

const MenuBar: React.FC<MenuBarProps> = ({ openSettings, openCommunityLibrary }) => {

  return (
    <div id="menu-bar">
      <button className="menu-button" title="Community Library" onClick={openCommunityLibrary}>
        <AutoStoriesIcon fontSize="inherit" />
      </button>
      <a
        href="https://docs.google.com/document/d/1eql1d57SB1DtiW8bkQswjnqmxsSl6Ken-96tjSLdG9k/edit?tab=t.0"
        target="_blank"
        rel="noopener noreferrer"
        className="menu-button"
        title="Documentation"
      >
        <ArticleOutlinedIcon fontSize="inherit" />
      </a>
      <a
        href="https://discord.gg/YuGhKy5snd" 
        target="_blank" 
        rel="noopener noreferrer"
        className="menu-button"
        title="Discord Community"
      >
        <Image src="/discord-icon.svg" alt="Discord Icon" width={24} height={24} style={{ objectFit: 'contain' }} />
      </a>

      {/* Profile Button and Menu */}
      <div className="profile-section">
        <button className="menu-button" title="Settings" onClick={openSettings}>
            <SettingsIcon fontSize="inherit" />
        </button>
      </div>
    </div>
  );
};

export default MenuBar;
