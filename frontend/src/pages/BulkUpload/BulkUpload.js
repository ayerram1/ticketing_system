import React, {useState } from "react";
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import { useDropzone } from "react-dropzone";
import DownloadTemplate from "../../services/bulkUploadServices/downloadTemplate";
import Stack from "@mui/material/Stack";
import {
    Button,
    Typography,
    Box,
    IconButton,
    LinearProgress,
    CircularProgress,
    Alert,
} from "@mui/material";
import { verifyFileService } from "../../services/bulkUploadServices/verifyFile";
import importBulk from "../../services/bulkUploadServices/importBulk";
import { useTheme } from "@mui/material/styles";
import {useNavigate} from "react-router-dom";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";

const BulkUpload = () => {
    const [studentFile, setStudentFile] = useState(null);
    const [projectFile, setProjectFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStep, setUploadStep] = useState("idle");
    const [failedStep, setFailedStep] = useState(null);
    const [uploadMessage, setUploadMessage] = useState("");
    const [overallProgress, setOverallProgress] = useState(0);
    const [errorDetails, setErrorDetails] = useState([]);
    
    const navigate = useNavigate();
    const theme = useTheme();

    const UPLOAD_STEPS = [
        { key: "validating-project", label: "Validate project file" },
        { key: "validating-students", label: "Validate student file" },
        { key: "importing-data", label: "Import all data" },
    ];

    const extractRows = (result) => result?.rows || result?.data || result?.parsedData || [];

    const getStepIndex = (key) => UPLOAD_STEPS.findIndex((s) => s.key === key);

    const getStepStatus = (stepKey) => {
        const current = getStepIndex(uploadStep);
        const target = getStepIndex(stepKey);

        if (failedStep) {
            const failedIndex = getStepIndex(failedStep);
            if (target < failedIndex) return "completed";
            if (target === failedIndex) return "error";
            return "pending";
        }

        if (uploadStep === "done") return "done";
        if (uploadStep === "idle") return "pending";
        if (target < current) return "completed";
        if (target === current) return "active";
        return "pending";
    };

    const getStepIcon = (status) => {
        if (status === "completed" || status === "done") {
            return <CheckCircleIcon fontSize="small" sx={{ color: "success.main" }} />;
        }
        if (status === "active") {
            return <HourglassTopIcon fontSize="small" sx={{ color: "warning.main" }} />;
        }
        if (status === "error") {
            return <ErrorIcon fontSize="small" sx={{ color: "error.main" }} />;
        }
        return <RadioButtonUncheckedIcon fontSize="small" sx={{ color: "text.disabled" }} />;
    };

    const handleBack = () => {
        navigate(-1); 
    };

    const onDropStudent = React.useCallback((acceptedFiles) => {
        setStudentFile(acceptedFiles && acceptedFiles.length ? acceptedFiles[0] : null);
    }, []);

    const onDropInstructor = React.useCallback((acceptedFiles) => {
        setProjectFile(acceptedFiles && acceptedFiles.length ? acceptedFiles[0] : null);
    }, []);

    const studentDrop = useDropzone({
        onDrop: onDropStudent,
        disabled: isUploading,
        accept: {
        "text/csv": [".csv"],
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"]
        },
        maxSize: 10 * 1024 * 1024, // 10MB
        multiple: false,
    });

    const instructorDrop = useDropzone({
        onDrop: onDropInstructor,
        disabled: isUploading,
        accept: {
        "text/csv": [".csv"],
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"]
        },
        maxSize: 10 * 1024 * 1024,
        multiple: false,
    });

    const handleUploadFiles = async () => {
        if (!studentFile || !projectFile) {
            alert("Please select both files to upload.");
            return;
        }
        
        try {
            setIsUploading(true);
            setErrorDetails([]);
            setFailedStep(null);
            setUploadStep("validating-project");
            setUploadMessage("Validating project file...");
            setOverallProgress(15);

            const verifyProjectResult = await verifyFileService(projectFile, "project");
            if (!verifyProjectResult.valid) {
                setFailedStep("validating-project");
                setUploadStep("error");
                setErrorDetails(verifyProjectResult.errors);
                return;
            }

            setUploadStep("validating-students");
            setUploadMessage("Validating student file...");
            setOverallProgress(35);

            const verifyStudentResult = await verifyFileService(studentFile, "student");
            if (!verifyStudentResult.valid) {
                setFailedStep("validating-students");
                setUploadStep("error");
                setErrorDetails(verifyStudentResult.errors);
                return;
            }

            setUploadStep("importing-data");
            setUploadMessage("Importing data...");
            setOverallProgress(65);

            await importBulk({
                projectRows: extractRows(verifyProjectResult),
                studentRows: extractRows(verifyStudentResult),
            });
            
            setUploadStep("done");
            setUploadMessage("Upload completed successfully.");
            setOverallProgress(100);
            setErrorDetails([]);
        } catch (err) {
            setFailedStep(uploadStep === "idle" ? "importing-data" : uploadStep);
            setUploadStep("error");
            setUploadMessage("Upload failed: "+ err.message);
            setErrorDetails([err.message || String(err)]);
        } finally {
            setIsUploading(false);
        }
    };


    return ( <>
        <Box
            sx={{
                minHeight: "calc(100vh - 60px)",
                backgroundColor: theme.palette.background.default,
                padding: "20px 0",
            }}
        >
            <Box
                sx={{
                    padding: 5,
                    backgroundColor: theme.palette.background.paper,
                    borderRadius: "10px",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                    maxWidth: "800px",
                    margin: "40px auto",
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
                    <IconButton
                        onClick={handleBack}
                        aria-label="back to admin settings"
                    >
                        <ArrowBackIosNewIcon sx={{ color: theme.palette.text.primary }} />
                    </IconButton>
                    <Typography
                        variant="h4"
                        sx={{
                            textAlign: "center",
                            fontWeight: "bold",
                            color: theme.palette.text.primary,
                            flexGrow: 1,
                        }}
                    >
                        Data Bulk Upload
                    </Typography>
                </Box>

                {/* Projects CSV dropzone */}
                <Box
                    sx={{
                    marginBottom: 5,
                    backgroundColor: (theme) => theme.palette.background.paper,
                    borderRadius: "10px",
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    padding: 2.5,
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                    }}
                >
                     <Typography 
                        variant="h5" 
                        sx={{ 
                            marginBottom: 2.5, 
                            fontWeight: "bold",
                            color: (theme) => theme.palette.text.primary
                        }}
                        >
                        Projects file
                    </Typography>

                    <Box sx={{ mt: 2, p: 1 }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                        <Typography 
                            variant="h7" 
                            sx={{ 
                            fontWeight: "bold",
                            color: theme.palette.text.primary
                            }}
                        >
                            Find project template here:
                        </Typography>
                        <DownloadTemplate ftype={"project"} />
                        </Stack>
                    </Box> 


                    <Box
                        {...instructorDrop.getRootProps()}
                        sx={{
                            mt: 2,
                            border: (theme) => `2px dashed ${projectFile ? theme.palette.primary.main : theme.palette.divider}`,
                            borderRadius: 1,
                            p: 3,
                            textAlign: "center",
                            cursor: "pointer",
                        }}
                        >
                        <input {...instructorDrop.getInputProps()} />
                        <UploadFileIcon fontSize="large" sx={{ mb: 1 }} />
                        <Typography>Drop Project CSV here or click to select</Typography>
                        <Typography variant="caption">CSV, XLSX — max 10MB</Typography>
                    </Box>

                    {projectFile && (
                    <Box sx={{ mt: 1, display: "flex", justifyContent: "space-between", p: 1, border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
                        <Typography sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{projectFile.name}</Typography>
                        <Box>
                        <Button size="small" disabled={isUploading} onClick={() => setProjectFile(null)}>Remove</Button>
                        </Box>
                    </Box>
                    )}
                </Box>


                {/* Student CSV dropzone */}
                <Box
                    sx={{
                    marginBottom: 5,
                    backgroundColor: (theme) => theme.palette.background.paper,
                    borderRadius: "10px",
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    padding: 2.5,
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                    }}
                >
                    <Typography 
                    variant="h5" 
                    sx={{ 
                        marginBottom: 2.5, 
                        fontWeight: "bold",
                        color: (theme) => theme.palette.text.primary
                    }}
                    >
                    Students file
                    </Typography>

                    <Box sx={{ mt: 2, p: 1 }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                        <Typography 
                            variant="h7" 
                            sx={{ 
                            fontWeight: "bold",
                            color: theme.palette.text.primary
                            }}
                        >
                            Find student template here:
                        </Typography>
                        <DownloadTemplate ftype={"student"}/>
                        </Stack>
                    </Box> 

   
                    <Box
                        {...studentDrop.getRootProps()}
                        sx={{
                            mt: 2,
                            border: (theme) => `2px dashed ${studentFile ? theme.palette.primary.main : theme.palette.divider}`,
                            borderRadius: 1,
                            p: 3,
                            textAlign: "center",
                            cursor: "pointer",
                        }}
                        >
                        <input {...studentDrop.getInputProps()} />
                        <UploadFileIcon fontSize="large" sx={{ mb: 1 }} />
                        <Typography>Drop Student CSV here or click to select</Typography>
                        <Typography variant="caption">CSV, XLSX — max 10MB</Typography>
                    </Box>

                    {studentFile && (
                    <Box sx={{ mt: 1, display: "flex", justifyContent: "space-between", p: 1, border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
                        <Typography sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{studentFile.name}</Typography>
                        <Box>
                        <Button size="small" disabled={isUploading} onClick={() => setStudentFile(null)}>Remove</Button>
                        </Box>
                    </Box>
                    )}

                </Box>

                {(isUploading || uploadStep === "done" || uploadStep === "error") && (
                    <Box sx={{ mb: 2 }}>
                        <Alert severity={uploadStep === "error" ? "error" : uploadStep === "done" ? "success" : "info"}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                {isUploading && <CircularProgress size={16} />}
                                <Typography variant="body2">
                                    {uploadMessage || "Preparing upload..."}
                                </Typography>
                            </Box>
                        </Alert>

                        {errorDetails.length > 0 && (
                            <Box sx={{ mt: 2, p: 2, backgroundColor: "#ffebee", borderRadius: 1, border: "1px solid #ef5350" }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#c62828", mb: 1 }}>
                                    {uploadStep === "error" ? "Upload Failed" : "Errors Found"}
                                </Typography>
                                <Box sx={{ maxHeight: 300, overflowY: "auto" }}>
                                    {errorDetails.map((error, idx) => (
                                        <Typography 
                                            key={idx}
                                            variant="body2" 
                                            sx={{ 
                                                color: "#c62828",
                                                mb: 0.5,
                                                fontFamily: "monospace",
                                                fontSize: "0.85rem",
                                                wordBreak: "break-word"
                                            }}
                                        >
                                            • {error}
                                        </Typography>
                                    ))}
                                </Box>
                                <Button 
                                    size="small" 
                                    variant="outlined"
                                    sx={{ mt: 1 }}
                                    onClick={() => setErrorDetails([])}
                                >
                                    Dismiss
                                </Button>
                            </Box>
                        )}

                        <Box sx={{ mt: 1 }}>
                            {UPLOAD_STEPS.map((step) => {
                                const status = uploadStep === "done" ? "done" : getStepStatus(step.key);
                                return (
                                <Typography
                                    key={step.key}
                                    variant="body2"
                                    sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                    opacity: status === "pending" ? 0.7 : 1,
                                    fontWeight: status === "active" ? 600 : 400,
                                    }}
                                >
                                    <span>{getStepIcon(status)}</span>
                                    <span>{step.label}</span>
                                </Typography>
                                );
                            })}
                        </Box>

                        <Box sx={{ mt: 1 }}>
                            <LinearProgress variant="determinate" value={overallProgress} />
                            <Typography variant="caption" sx={{ mt: 0.5, display: "block" }}>
                                Overall progress: {overallProgress}%
                            </Typography>
                        </Box>
                    </Box>
                )}

                <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                    <Button variant="contained" disabled={isUploading} onClick={() => handleUploadFiles()} >Upload Files</Button>
                    <Button variant="outlined" disabled={isUploading} onClick={() => { setStudentFile(null); setProjectFile(null); }}>Clear</Button>
                </Box>

            </Box>
        </Box>
      </>
    );
};

export default BulkUpload;