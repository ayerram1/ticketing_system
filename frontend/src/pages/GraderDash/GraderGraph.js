import React, { useEffect, useState } from "react";
import Chart from "chart.js/auto";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Cookies from "js-cookie";
import { fetchTicketAssignmentsByUserId, fetchTaTicketAssignmentsByUserId, fetchTaTicketById, fetchTicketById} from "../../services/ticketServices";


const GraderChart = () => {
    const [user, setUser] = useState(null);
    const [GraderTicket, setGraderTicket] = useState([]);
    try{

    useEffect(() => {
        const fetchTickets = async () =>{
            const GraderAssigned = await fetchTicketAssignmentsByUserId();
            const ticketList = await Promise.all(GraderAssigned.map(async (ticket) => {
                let ticketData;
                ticketData = await fetchTicketById(ticket.ticket_id);
                return ticketData;
        }));
        setGraderTicket(ticketList);
    };
    fetchTickets();
    },[]);


    useEffect(()=> {
        const ID = document.getElementById('GChart');
        let TempData = [];
        for(let i = 0; i<12; i++){
            TempData.push(GraderTicket?.filter(ticket => { const month = new Date(ticket.created_at).getMonth();
                        return month ===i && ticket.created_at !== null}).length)
        }
        const Data = TempData;

        const GraderChart = new Chart(ID, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [
                {
                    label: 'Total Tickets',
                    data: Data, 
                    backgroundColor: 'pink', 
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
                        text: 'Tickets Assigned per Month',
                    }
                },
                responsive: true
            },
        },[GraderTicket]);
        return () => {
          GraderChart.destroy();
        };
    }, [user, GraderTicket]);
    return(
    <Box>
        <canvas id= "GChart" />
    </Box>
    );
}catch (err) {
      console.error("Error dispalying Graph", err);
    }
};

export default GraderChart;