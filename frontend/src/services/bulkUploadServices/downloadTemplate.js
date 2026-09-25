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
        { label: "cohort_start_semester", key: "cohort_start_semester" },
        { label: "current_semester", key: "current_semester" },
        { label: "capstone_course", key: "capstone_course" },
        { label: "program_type", key: "program_type" },
      ],
    };
    const headers = headermap[ftype];


    const datamap = {
      student: [
        { name: `"Buckridge, Jimmie"`, 
          canvas_user_id: 561555, 
          user_id: 6, 
          login_id: "Jimmie.Buckridge", 
          sections: 64475, 
          group_name: "Turcotte and Sons", 
          canvas_group_id: 690105, 
          sponsor: "admin1@asu.edu"
        },
      ],
      project: [
        { project: "Turcotte and Sons", 
          sponsor: "Maurine Farrell", 
          "sponsor email": "admin1@asu.edu", 
          instructor: "Myrna Daniel", 
          "instructor email":
          "Myrna_Daniel@asu.edu",
          grader: "Jordan Lee",
          "grader email":
          "jordan.lee@asu.edu",
          cohort_start_semester: "Spring 2026",
          current_semester: "Fall 2026",
          capstone_course: "Capstone 2",
          program_type: "Online",
        },
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
