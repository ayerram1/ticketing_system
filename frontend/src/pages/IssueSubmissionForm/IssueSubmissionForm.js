import React, { useState } from "react";

const IssueSubmissionForm = () => {
  const [studentName, setStudentName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [sponsorName, setSponsorName] = useState("");
  const [section, setSection] = useState("");
  const [instructorName, setInstructorName] = useState("");
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [teamMembers, setTeamMembers] = useState("");
  const [showModal, setShowModal] = useState(false); // Modal state

  const handleSubmit = (event) => {
    event.preventDefault();

    const submittedData = {
      studentName, // student_id
      teamName, // team_id
      sponsorName, // sponsor_name
      section, // ??
      instructorName, // ticket assignment user_id
      issueType, // issue_type
      description, // issue_desciption
      //teamMembers, // dont need this (based on the group & group issue)
    };

    console.log(submittedData);
    alert("Ticket submitted successfully!");

    // Resets the form
    setStudentName("");
    setTeamName("");
    setSponsorName("");
    setSection("");
    setInstructorName("");
    setIssueType("");
    setDescription("");
    setTeamMembers("");
    setShowModal(false);
  };

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: "20px",
        padding: "20px",
        backgroundColor: "#f0f0f0", // Subtle background
        height: "100vh",
      }}
    >
      <h1 style={{ color: "#8C1D40", fontSize: "2rem", marginBottom: "20px" }}>
        Submit New Request
      </h1>
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          backgroundColor: "#fff",
          padding: "20px",
          borderRadius: "10px",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
          maxWidth: "500px",
          width: "100%",
        }}
      >
        <label
          htmlFor="studentName"
          style={{ fontWeight: "bold", color: "#555" }}
        >
          Student Name:
        </label>
        <input
          type="text"
          id="studentName"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          required
          style={{
            padding: "10px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            fontSize: "1rem",
          }}
        />

        <label htmlFor="teamName" style={{ fontWeight: "bold", color: "#555" }}>
          Team Name:
        </label>
        <input
          type="text"
          id="teamName"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          required
          style={{
            padding: "10px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            fontSize: "1rem",
          }}
        />

        <label
          htmlFor="sponsorName"
          style={{ fontWeight: "bold", color: "#555" }}
        >
          Sponsor Name:
        </label>
        <input
          type="text"
          id="sponsorName"
          value={sponsorName}
          onChange={(e) => setSponsorName(e.target.value)}
          required
          style={{
            padding: "10px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            fontSize: "1rem",
          }}
        />

        <label htmlFor="section" style={{ fontWeight: "bold", color: "#555" }}>
          Class Section:
        </label>
        <select
          id="section"
          value={section}
          onChange={(e) => setSection(e.target.value)}
          required
          style={{
            padding: "10px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            fontSize: "1rem",
          }}
        >
          <option value="" disabled>
            Select Section
          </option>
          <option value="MW1">M/W 10:30-11:20</option>
          <option value="MW2">M/W 12:00-12:50</option>
          <option value="MW3">M/W 3:00-3:50</option>
          <option value="MW4">M/W 4:30-5:20</option>
          <option value="TT1">T/Th 10:30-11:20</option>
          <option value="TT2">T/Th 12:00-12:50</option>
          <option value="TT3">T/Th 3:00-3:50</option>
          <option value="TT4">T/Th 4:30-5:20</option>
        </select>

        <label
          htmlFor="instructorName"
          style={{ fontWeight: "bold", color: "#555" }}
        >
          Instructor Name:
        </label>
        <input
          type="text"
          id="instructorName"
          value={instructorName}
          onChange={(e) => setInstructorName(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            fontSize: "1rem",
          }}
        />

        <label
          htmlFor="issueType"
          style={{ fontWeight: "bold", color: "#555" }}
        >
          Select Issue Type:
        </label>
        <select
          id="issueType"
          value={issueType}
          onChange={(e) => setIssueType(e.target.value)}
          required
          style={{
            padding: "10px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            fontSize: "1rem",
          }}
        >
          <option value="" disabled>
            Select an issue
          </option>
          <option value="sponsorIssue">Issues with Sponsor</option>
          <option value="teamIssue">Issues within the Team</option>
          <option value="assignmentIssue">
            Issues with Assignments or Grading (Including Extensions)
          </option>
          <option value="Bug">Bug</option>
          <option value="Feature Request">Feature Request</option>
          <option value="Question">Question</option>
          <option value="other">Other</option>
        </select>

        <label
          htmlFor="description"
          style={{ fontWeight: "bold", color: "#555" }}
        >
          Description:
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows="4"
          required
          style={{
            padding: "10px",
            borderRadius: "5px",
            border: "1px solid #ccc",
            fontSize: "1rem",
            resize: "none",
          }}
        />
        <button
          type="submit"
          style={{
            backgroundColor: "#8C1D40",
            color: "#fff",
            padding: "10px",
            borderRadius: "5px",
            border: "none",
            fontSize: "1rem",
            cursor: "pointer",
            marginTop: "10px",
          }}
        >
          Submit Request
        </button>
      </form>
    </div>
  );
};

export default IssueSubmissionForm;
