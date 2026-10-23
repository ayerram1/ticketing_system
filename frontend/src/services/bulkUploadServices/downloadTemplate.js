import React from "react";
import {Button} from "@mui/material";
import DownloadIcon from '@mui/icons-material/Download';
import { CSVLink } from "react-csv";
import { useTheme } from "@mui/material/styles";

function DownloadTemplate({ ftype }) {
    const theme = useTheme();

    //TO-DO: make sure download type can be uploaded itself
    const headermap = {
      student: [
        { label: "name", key: "name" },
        { label: "canvas_user_id", key: "canvas_user_id" },
        { label: "user_id", key: "user_id" },
        { label: "login_id", key: "login_id" },
        { label: "sections", key: "sections" },
        { label: "group_name", key: "group_name" },
        { label: "canvas_group_id", key: "canvas_group_id" },
        { label: "sponsor", key: "sponsor" },
      ],
      project: [
        { label: "project", key: "project" },
        { label: "sponsor", key: "sponsor" },
        { label: "sponsor email", key: "sponsor email" },
        { label: "instructor", key: "instructor" },
        { label: "instructor email", key: "instructor email" },
        { label: "grader", key: "grader" },
        { label: "grader email", key: "grader email" },
      ],
    };
    const headers = headermap[ftype];


    const datamap = {
      student: [
        { name: `"Livingston, Remington"`, 
          canvas_user_id: 561555, 
          user_id: 1352688424, 
          login_id: "WEOFCN", 
          sections: 87968, 
          group_name: "Project 10", 
          canvas_group_id: 690105, 
          sponsor: "sponsor1@gmail.com"
        },
      ],
      project: [
        { project: "Project 10", 
          sponsor: "sponsor Name", 
          "sponsor email": "sponsor1@gmail.com", 
          instructor: "instructor1", 
          "instructor email":
          "instructor@asu.edu",
          grader: "Grader1",
          "grader email":
          "grader1@asu.edu",},
      ]
    };
    const data = datamap[ftype];


    const filenameMap = {
      student: "Student_Template.csv",
      project: "Project_Template.csv",
    };
    const filename = filenameMap[ftype] || `template-${ftype}.csv`;


  return (
     <Button
      variant="contained"
      startIcon={<DownloadIcon />}
      sx={{
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.getContrastText
          ? theme.palette.getContrastText(theme.palette.primary.main)
          : theme.palette.primary.contrastText,
        "&:hover": {
          backgroundColor: theme.palette.primary.dark || theme.palette.primary.main,
        },
        textTransform: "none",
      }}
    >
      <CSVLink
        data={data}
        headers={headers}
        filename={filename}
        separator=","
        enclosingCharacter=""  
        uFEFF={true}
        target="_blank"
        style={{ color: "inherit", textDecoration: "none" }}
      >
        Download
      </CSVLink>
    </Button>
  );
}

export default DownloadTemplate;