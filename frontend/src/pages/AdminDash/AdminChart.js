import React, { useEffect, useState } from "react";
import Chart from "chart.js/auto";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Cookies from "js-cookie";

const baseURL = process.env.REACT_APP_API_BASE_URL;

const AdminChart = () => {
    const token = Cookies.get("token");
    const [user, setUser] = useState(null);
    const [StudentTicket, setStudentTicket] = useState([]);
    const [TaTickets, setTaTickets] = useState([]);
    try{

    useEffect(() => {
        const fetchTickets = async () =>{
        const studentParams = new URLSearchParams({
                page: '1',
                limit: '1000'  // Get all tickets (or a very large number)
            });
            
            const taParams = new URLSearchParams({
                page: '1', 
                limit: '1000'  // Get all tickets (or a very large number)
            });
            const studentTicketsResponse = await fetch(`${baseURL}/api/tickets?${studentParams}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            const TaTicketsResponse = await fetch(`${baseURL}/api/tatickets?${taParams}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            const studentTicketsData = await studentTicketsResponse.json();
            const TaTicketsData = await TaTicketsResponse.json();
            const studentTicketsRaw = studentTicketsData.tickets || studentTicketsData;
            const TaTicketsRaw = TaTicketsData.tickets || TaTicketsData;

            setStudentTicket(studentTicketsRaw);
            setTaTickets(TaTicketsRaw);


    };
    fetchTickets();
    },[]);


    useEffect(()=> {
        let TempData = [];
        for(let i = 0; i<12; i++){
            TempData.push(StudentTicket?.filter(ticket => { const month = new Date(ticket.created_at).getMonth();
                        return month ===i && ticket.created_at !== null}).length)
        }
        for(let i = 0; i<12; i++){
            TempData[i] += TaTickets?.filter(ticket => { const month = new Date(ticket.created_at).getMonth();
                        return month ===i && ticket.created_at !== null}).length;
        }
        const Data = TempData;

        const newChart = new Chart(user, {
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
                        suggestedMin: 0
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Total Tickets Made per Month',
                    }
                }
            },
        },[StudentTicket]);
        return () => {
          newChart.destroy();
        };
    }, [user, StudentTicket]); 
    return (
        <Box>
          <canvas ref={setUser} />
        </Box>
    );
}catch (err) {
      console.error("Error dispalying Graph", err);
    }
};

export default AdminChart;