import React, { useEffect, useState } from "react";
import Chart from "chart.js/auto";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";

const NewChart = () => {
    const theme = useTheme();
    

  const [user, setUser] = useState(null);

  useEffect(() => {
    
    const newChart = new Chart(user, {
      type: 'line',
      data: {
        labels: ['1', '2', '3', '4', '5', '6'],
        datasets: [
          {
            label: 'Test',
            data:[1, 2, 3, 4, 5, 6],
            backgroundColor: 'red', 
            borderColor: 'blue',      
            borderWidth: 1,
          },
        ],
      },
    });
    return () => {
      newChart.destroy();
    };
  }, [user]); 
  return (
    <Box>
      <canvas ref={setUser} />
    </Box>
  );
};

export default NewChart;