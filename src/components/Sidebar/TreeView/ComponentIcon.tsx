/**
 * ComponentIcon component
 * Renders the appropriate icon based on component type with the correct styling
 */

import React from "react";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import PersonIcon from "@mui/icons-material/Person";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import AbcIcon from "@mui/icons-material/Abc";
import BrushIcon from "@mui/icons-material/Brush";

interface ComponentIconProps {
  componentType: "instruction" | "role" | "context" | "format" | "style";
}

const ComponentIcon: React.FC<ComponentIconProps> = ({ componentType }) => {
  switch (componentType) {
    case "instruction":
      return <FormatListBulletedIcon fontSize="small" className="instruction-icon" />;
    case "role":
      return <PersonIcon fontSize="small" className="role-icon" />;
    case "context":
      return <LibraryBooksIcon fontSize="small" className="context-icon" />;
    case "format":
      return <AbcIcon fontSize="small" className="format-icon" />;
    case "style":
      return <BrushIcon fontSize="small" className="style-icon" />;
    default:
      // TypeScript should prevent this case, but adding as a fallback
      return <FormatListBulletedIcon fontSize="small" className="instruction-icon" />;
  }
};

export default ComponentIcon;