import React, { useEffect, useState } from "react";
import Chart from "chart.js/auto";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Cookies from "js-cookie";
import {fetchTaTicketsByUserId } from "../../services/ticketServices";

const baseURL = process.env.REACT_APP_API_BASE_URL;

const DevGraph = () => {
    const [user, setUser] = useState(null);
    const [Bugs, setBugs] = useState([]);
    try{

    useEffect(() => {
        const fetchBugs = async () =>{
            const token = Cookies.get("token");
            const response = await fetch(
          `${process.env.REACT_APP_API_BASE_URL || ""}/api/bug-reports`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
          }
        );
            
            const BugList = await response.json();
            const Bug = Array.isArray(BugList?.data) ? BugList.data : [];
            setBugs(Bug);


    };
    fetchBugs();
    },[]);


    useEffect(()=> {
        const ID = document.getElementById('DevChart');
        let TempData = [];
        for(let i = 0; i<12; i++){
            TempData.push(Bugs?.filter(bug => { const month = new Date(bug.createdAt).getMonth();
                        return month ===i && bug.createdAt !== null}).length)
        }
        const Data = TempData;

        const DeveloperGraph = new Chart(ID, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [
                {
                    label: 'Total Tickets',
                    data: Data, 
                    backgroundColor: 'red', 
                    borderColor: 'blue',      
                    borderWidth: 1
                },
                ],
            },
            options: {
                scales: {
                    y:{
                        min: 0,
                        max: 20,
                        ticks: {
                            maxTicksLimit: 5
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Tickets Made per Month',
                    }
                    
                },
                responsive: true
            },
        },[Bugs]);

        //InstGraph.resize(500, 220);
        return () => {
          DeveloperGraph.destroy();
        };
    }, [user, Bugs]); 
    return (
        <Box>
          <canvas id= "DevChart" />
        </Box>
    );
}catch (err) {
      console.error("Error dispalying Graph", err);
    }
};

export default DevGraph;