import React, { useEffect, useState } from "react";
import Chart from "chart.js/auto";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Cookies from "js-cookie";
import { fetchTicketsByUserId } from "../../services/ticketServices";

const baseURL = process.env.REACT_APP_API_BASE_URL;

const StudentChart = () => {
    const [user, setUser] = useState(null);
    const [StudentTicket, setStudentTicket] = useState([]);
    try{

    useEffect(() => {
        const fetchTickets = async () =>{
            const response = await fetchTicketsByUserId(1, 1000);
            
            const studentTickets = response.tickets || response;
            
            const studentTicketsData = studentTickets;
            const studentTicketsRaw = studentTicketsData.tickets || studentTicketsData;

            setStudentTicket(studentTicketsRaw);


    };
    fetchTickets();
    },[]);


    useEffect(()=> {
        const ID = document.getElementById('myChart');
        let TempData = [];
        for(let i = 0; i<12; i++){
            TempData.push(StudentTicket?.filter(ticket => { const month = new Date(ticket.created_at).getMonth();
                        return month ===i && ticket.created_at !== null}).length)
        }
        const Data = TempData;

        const StuChart = new Chart(ID, {
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
                        min: 0
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Tickets Made per Month',
                    }
                }
            },
        },[StudentTicket]);
        return () => {
          StuChart.destroy();
        };
    }, [user, StudentTicket]); 
    return (
        <Box>
          <canvas id= "myChart" />
        </Box>
    );
}catch (err) {
      console.error("Error dispalying Graph", err);
    }
};

export default StudentChart;