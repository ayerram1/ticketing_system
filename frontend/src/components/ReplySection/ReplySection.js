import { Button, Stack, TextField, Typography } from "@mui/material";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ReplyBox from "../ReplyBox/ReplyBox";
import "./ReplySection.css";
const baseURL = process.env.REACT_APP_API_BASE_URL;

const ReplySection = () => {
  const [newReplyText, setNewReplyText] = useState("");
  const [repliesData, setRepliesData] = useState([]);
  const [loadingRepliesData, setLoadingRepliesData] = useState(true);
  const [error, setError] = useState(false);
  const [shouldRefresh, setShouldRefresh] = useState(false);
  let navigate = useNavigate();

  const location = useLocation();
  const urlParameters = new URLSearchParams(location.search);
  const ticketId = urlParameters.get("ticket");

  const token = Cookies.get("token");
  const decodedToken = jwtDecode(token);
  const userId = decodedToken.id;

  useEffect(() => {
    const fetchReplies = async () => {
        try {
            const repliesDataResponse = await fetch(
                `${baseURL}/api/communications/${ticketId}/communications`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            console.log("API Response Status:", repliesDataResponse.status); // ✅ Log response status

            const repliesData = await repliesDataResponse.json();
            console.log("Replies Data:", repliesData); // ✅ Log API response data

            repliesData.map((reply) => {
                // Convert date into a more readable string
                const date = new Date(reply.created_at);
                const dateString = date.toLocaleString("en-US");
                reply.created_at = dateString;
            });

            setRepliesData(repliesData);
        } catch (err) {
            console.log("Error fetching replies:", err);
            setError(true);
        } finally {
            setLoadingRepliesData(false);
        }
    };

    fetchReplies();
  }, [ticketId, shouldRefresh]);

  if (error) {
    navigate("/unauthorized");
  }

  const handleChange = (event) => {
    setNewReplyText(event.target.value);
  };

  const handleSubmit = async () => {
    if (newReplyText != "") {
      try {
        const response = await fetch(
          `${baseURL}/api/communications/${ticketId}/communications`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              ticket_id: ticketId,
              user_id: userId,
              message: newReplyText,
            }),
          }
        );
        setShouldRefresh((prev) => !prev);
        setNewReplyText("");

        //Scrolls down along with reply
        //Needs timeout in order to wait for refresh of replys
        setTimeout(()=>{
          window.scrollTo({top:document.documentElement.scrollHeight, behavior: 'smooth'});
        }, 175);
      } catch (err) {
        console.log(err);
      }
    }
  };

  //Used in order to reach the bottom of the page
  const handleScrollD = async () =>{
    window.scrollTo({top:document.documentElement.scrollHeight, behavior: 'smooth'});
  };



  return (
    <>
      {!loadingRepliesData ? (
        <Stack className="replySection" direction="column">
          {/* Previous Replies */}
          {repliesData.length > 0 && (
            <>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>Conversation History:</Typography>
              <Button
                className="postButton"
                variant="contained"
                onClick ={handleScrollD}
                >
                  Recent Reply
              </Button>
              {repliesData.map((reply) => (
                <ReplyBox
                  key={reply.communication_id}
                  className="reply"
                  reply={reply.message}
                  author={reply.user_name}
                  time={reply.created_at}
                ></ReplyBox>
              ))}
            </>
          )}
          
          {/* Post New Reply Section */}
          <TextField
            id="outlined-multiline-static"
            multiline
            rows={2}
            label="Enter Your Reply Here"
            value={newReplyText}
            onChange={handleChange}
            sx={{
              mb: 1,
              mt: repliesData.length > 0 ? 3 : 0,
              '& .MuiInputLabel-root': {
                transform: 'translate(14px, 16px) scale(1)',
                '&.Mui-focused, &.MuiFormLabel-filled': {
                  transform: 'translate(14px, -9px) scale(0.75)'
                }
              }
            }}
          />
          <Button
            className="postButton"
            variant="contained"
            onClick={handleSubmit}
            
          >
            Post Reply
          </Button>
        </Stack>
      ) : (
        <div>Loading Replies </div>
      )}
    </>
  );
};

export default ReplySection;
