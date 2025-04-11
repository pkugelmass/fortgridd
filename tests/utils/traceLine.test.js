console.log("utils/traceLine.test.js loaded");

QUnit.module('traceLine (utils.js)', function() {

    QUnit.test('Calculates Bresenham line coordinates', function(assert) {
        // Test case 1: Simple horizontal line
        let line1 = traceLine(0, 0, 3, 0);
        assert.deepEqual(line1, [
            { row: 0, col: 0 },
            { row: 0, col: 1 },
            { row: 0, col: 2 },
            { row: 0, col: 3 }
        ], 'Horizontal line (0,0) to (3,0)');

        // Test case 2: Simple vertical line
        let line2 = traceLine(1, 1, 1, 4);
        assert.deepEqual(line2, [
            { row: 1, col: 1 },
            { row: 2, col: 1 },
            { row: 3, col: 1 },
            { row: 4, col: 1 }
        ], 'Vertical line (1,1) to (1,4)');

        // Test case 3: Diagonal line (45 degrees)
        let line3 = traceLine(0, 0, 3, 3);
        assert.deepEqual(line3, [
            { row: 0, col: 0 },
            { row: 1, col: 1 },
            { row: 2, col: 2 },
            { row: 3, col: 3 }
        ], 'Diagonal line (0,0) to (3,3)');

        // Test case 4: Diagonal line (other direction)
        let line4 = traceLine(0, 3, 3, 0);
        assert.deepEqual(line4, [
            { row: 3, col: 0 },
            { row: 2, col: 1 },
            { row: 1, col: 2 },
            { row: 0, col: 3 }
        ], 'Diagonal line (0,3) to (3,0)');

        // Test case 5: Non-45 degree line (more horizontal)
        let line5 = traceLine(0, 0, 4, 2);
        assert.deepEqual(line5, [
            { row: 0, col: 0 },
            { row: 1, col: 1 },
            { row: 1, col: 2 },
            { row: 2, col: 3 },
            { row: 2, col: 4 }
        ], 'Shallow angle line (0,0) to (4,2)');

         // Test case 6: Non-45 degree line (more vertical)
        let line6 = traceLine(0, 0, 2, 4);
         // Expected based on manual trace of the implementation:
         assert.deepEqual(line6, [
            { row: 0, col: 0 },
            { row: 1, col: 1 }, // Corrected
            { row: 2, col: 1 }, // Corrected
            { row: 3, col: 2 }, // Corrected
            { row: 4, col: 2 }  // Corrected
        ], 'Steep angle line (0,0) to (2,4)');

        // Test case 7: Single point
        let line7 = traceLine(5, 5, 5, 5);
        assert.deepEqual(line7, [
            { row: 5, col: 5 }
        ], 'Single point line (5,5) to (5,5)');
    });

});
